import { randomUUID } from 'node:crypto'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { detectFileType, MAX_FILE_BYTES, validId, validateFields } from '@/lib/intake'
import { createDraft, getDraft, INTAKE_BUCKET, IntakeError, intakeFailure, intakeJson, intakeResponse, limitedBody, networkKey, requireTarget, sameOrigin, takeLimit } from '@/lib/intake-server'
import { extractIntake } from '@/lib/intake-ai'

export const runtime = 'nodejs'
export const maxDuration = 60
type Context = { params: Promise<{ listingId: string }> }

export async function POST(request: Request, context: Context) {
  try {
    sameOrigin(request)
    const { listingId } = await context.params
    if (!validId(listingId)) throw new IntakeError('事業所が見つかりません。', 404)
    const body = await intakeJson(request)
    const db = getSupabaseServiceClient()
    if (body.action === 'start') {
      await requireTarget(listingId)
      await takeLimit(`start:${networkKey(request)}`, 20, 3600)
      return intakeResponse({ draftId: await createDraft(listingId), aiAvailable: Boolean(process.env.OPENAI_API_KEY) })
    }
    const draft = await getDraft(listingId, body.action === 'submit')
    if (body.draftId !== draft.id) throw new IntakeError('別の画面で入力が開始されています。このページを開き直してください。', 409)
    if (body.action === 'extract') {
      await requireTarget(listingId)
      if (body.aiConsent !== true || typeof body.fileId !== 'string' || !validId(body.fileId)) throw new IntakeError('AI読取りへの同意と添付書類を確認してください。')
      if (!process.env.OPENAI_API_KEY) throw new IntakeError('現在AI読取りは利用できません。手入力でお申込みいただけます。', 503)
      const file = await db.from('cares_intake_files').select('storage_path,mime_type,size_bytes').eq('id', body.fileId).eq('draft_id', draft.id).eq('ready', true).single()
      if (file.error || !file.data) throw new IntakeError('添付書類が見つかりません。', 404)
      await takeLimit(`ai-draft:${draft.id}`, 5, 86400)
      await takeLimit(`ai-network:${networkKey(request)}`, 15, 86400)
      await takeLimit('ai-global', 200, 86400)
      const download = await db.storage.from(INTAKE_BUCKET).download(file.data.storage_path)
      if (download.error || !download.data) throw new Error('file download failed')
      const bytes = Buffer.from(await download.data.arrayBuffer())
      if (bytes.length !== file.data.size_bytes || detectFileType(bytes) !== file.data.mime_type) throw new Error('invalid attachment')
      return intakeResponse({ fields: await extractIntake(bytes, file.data.mime_type) })
    }
    if (body.action === 'submit') {
      if (body.consent !== true || body.reviewed !== true) throw new IntakeError('送信内容と個人情報の提供への同意を確認してください。')
      if (!Array.isArray(body.fileIds) || body.fileIds.length > 3 || body.fileIds.some(id => typeof id !== 'string' || !validId(id))) throw new IntakeError('添付書類を確認してください。')
      let fields
      try { fields = validateFields(body.fields) } catch (e) { throw new IntakeError((e as Error).message) }
      // Target/recipient/expiry checks and notification creation run atomically in the RPC.
      await takeLimit(`submit:${networkKey(request)}`, 30, 3600)
      const { data, error } = await db.rpc('cares_intake_submit', { p_draft: draft.id, p_hash: draft.hash, p_fields: fields, p_file_ids: body.fileIds })
      if (error || !data) throw new IntakeError('受付状況が変わったか、添付処理が未完了です。入力内容を残したまま再試行できます。解消しない場合は事業所に直接ご連絡ください。', 409)
      return intakeResponse({ id: data })
    }
    throw new IntakeError('操作を確認してください。')
  } catch (e) { return intakeFailure(e) }
}

export async function PUT(request: Request, context: Context) {
  try {
    sameOrigin(request)
    const { listingId } = await context.params
    await requireTarget(listingId)
    const draft = await getDraft(listingId)
    await takeLimit(`upload:${networkKey(request)}`, 30, 3600)
    const raw = await limitedBody(request, MAX_FILE_BYTES + 16384)
    const form = await new Response(new Uint8Array(raw), { headers: { 'Content-Type': request.headers.get('content-type') || '' } }).formData()
    if (form.get('draftId') !== draft.id) throw new IntakeError('別の画面で入力が開始されています。このページを開き直してください。', 409)
    const file = form.get('file')
    if (form.get('consent') !== 'true') throw new IntakeError('添付書類の提供への同意を確認してください。')
    if (!(file instanceof File) || !file.size || file.size > MAX_FILE_BYTES) throw new IntakeError('1ファイル3MBまでの画像・PDFを選んでください。')
    const bytes = Buffer.from(await file.arrayBuffer())
    const mime = detectFileType(bytes)
    if (!mime) throw new IntakeError('JPEG・PNG・WebP画像、またはPDFを選んでください。HEICはJPEGに変換してください。')
    const db = getSupabaseServiceClient(); const id = randomUUID()
    const reserved = await db.rpc('cares_intake_reserve_file', { p_draft: draft.id, p_hash: draft.hash, p_id: id, p_mime: mime, p_size: bytes.length })
    if (reserved.error || typeof reserved.data !== 'string') throw new IntakeError('添付は3件までです。不要な書類を外してからお試しください。', 409)
    const upload = await db.storage.from(INTAKE_BUCKET).upload(reserved.data, bytes, { contentType: mime, upsert: false })
    if (upload.error) {
      // Keep a cleanup record even if a network timeout leaves an object behind.
      await db.from('cares_intake_files').update({ deleting: true }).eq('id', id)
      throw new IntakeError('添付できませんでした。ページを開き直してお試しください。', 503)
    }
    const ready = await db.from('cares_intake_files').update({ ready: true }).eq('id', id)
    if (ready.error) throw new Error('file finalization failed')
    return intakeResponse({ id, mime, size: bytes.length })
  } catch (e) { return intakeFailure(e) }
}

export async function DELETE(request: Request, context: Context) {
  try {
    sameOrigin(request)
    const { listingId } = await context.params
    const draft = await getDraft(listingId)
    const body = await intakeJson(request)
    if (body.draftId !== draft.id) throw new IntakeError('入力セッションが変わりました。', 409)
    if (typeof body.fileId !== 'string' || !validId(body.fileId)) throw new IntakeError('書類を選び直してください。')
    const db = getSupabaseServiceClient()
    const detached = await db.rpc('cares_intake_detach_file', { p_draft: draft.id, p_hash: draft.hash, p_file: body.fileId })
    if (detached.error || typeof detached.data !== 'string') throw new IntakeError('この書類は削除できません。', 409)
    const removed = await db.storage.from(INTAKE_BUCKET).remove([detached.data])
    if (removed.error) throw new Error('attachment removal failed')
    const deleted = await db.from('cares_intake_files').delete().eq('id', body.fileId).eq('draft_id', draft.id)
    if (deleted.error) throw new Error('file record removal failed')
    return intakeResponse({ success: true })
  } catch (e) { return intakeFailure(e) }
}
