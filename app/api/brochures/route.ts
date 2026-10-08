import { createHash } from 'node:crypto'
import { BROCHURE_MAX_BYTES, BROCHURE_MAX_FILES, brochureMetadata } from '@/lib/brochures'
import { BROCHURE_BUCKET, brochureList, brochureListing, brochureUser, validateBrochureFile } from '@/lib/brochures-server'
import { validId } from '@/lib/intake'
import { IntakeError, intakeFailure, intakeResponse, limitedBody, sameOrigin, takeLimit, networkKey } from '@/lib/intake-server'
import { getSupabaseServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const mode = params.get('mode') || 'public'
    const offset = Number(params.get('offset') || 0)
    if (!['public', 'shared', 'saved'].includes(mode) || !Number.isInteger(offset) || offset < 0 || offset > 100000) throw new IntakeError('表示条件を確認してください。')
    const user = await brochureUser(mode !== 'public')
    const listing = mode === 'public' ? await brochureListing(params.get('listing') || '') : undefined
    return intakeResponse({ ...await brochureList({ listing, user, mode, offset }), authenticated: Boolean(user) })
  } catch (error) { return intakeFailure(error) }
}

export async function POST(request: Request) {
  try {
    sameOrigin(request)
    const user = (await brochureUser(true))!
    const raw = await limitedBody(request, BROCHURE_MAX_BYTES + 32768)
    let form: FormData
    try { form = await new Response(new Uint8Array(raw), { headers: { 'Content-Type': request.headers.get('content-type') || '' } }).formData() }
    catch { throw new IntakeError('ファイルを選び直してください。') }
    const id = String(form.get('id') || '')
    if (!validId(id)) throw new IntakeError('ページを開き直してください。')
    if (form.get('consent') !== 'true') throw new IntakeError('一般公開してよい資料であることを確認してください。')
    const listing = await brochureListing(String(form.get('listing') || ''))
    let metadata
    try { metadata = brochureMetadata({ title: form.get('title'), note: form.get('note'), issuedMonth: form.get('issuedMonth') }) }
    catch (error) { throw new IntakeError((error as Error).message) }
    const files = form.getAll('files')
    if (!files.length || files.length > BROCHURE_MAX_FILES || files.some(file => !(file instanceof File) || !file.size)) throw new IntakeError('PDFまたは写真を1〜3件選んでください。')
    const selected = files as File[]
    if (selected.reduce((size, file) => size + file.size, 0) > BROCHURE_MAX_BYTES) throw new IntakeError('ファイルの合計は3MB以内にしてください。', 413)
    await takeLimit(`brochures-upload:${user}`, 15, 86400)
    await takeLimit(`brochures-network:${networkKey(request)}`, 50, 86400)
    const buffers = await Promise.all(selected.map(async file => Buffer.from(await file.arrayBuffer())))
    const types = await Promise.all(buffers.map(validateBrochureFile))
    const extensions: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
    const stored = buffers.map((bytes, index) => ({ path: `${id}/${index}.${extensions[types[index]]}`, mime: types[index], size: bytes.length }))
    const hash = createHash('sha256').update(JSON.stringify({ listing, ...metadata, files: stored })).update(Buffer.concat(buffers)).digest('hex')
    const db = getSupabaseServiceClient()
    const reserve = await db.from('cares_brochures').insert({ id, listing_id: listing, user_id: user, ...metadata, files: stored, request_hash: hash })
    if (reserve.error && reserve.error.code !== '23505') throw new Error('reservation failed')
    // Reusing an upload ID cannot replace another user's file or different content.
    const existing = await db.from('cares_brochures').select('user_id,request_hash,status').eq('id', id).single()
    if (existing.error || !existing.data || existing.data.user_id !== user || existing.data.request_hash !== hash) throw new IntakeError('別の内容が送信されています。ページを開き直してください。', 409)
    if (existing.data.status === 'published') return intakeResponse({ id }, 200)
    if (existing.data.status !== 'uploading') throw new IntakeError('この資料は再公開できません。', 409)
    for (let index = 0; index < stored.length; index++) {
      const upload = await db.storage.from(BROCHURE_BUCKET).upload(stored[index].path, buffers[index], { contentType: types[index], upsert: true })
      if (upload.error) throw new IntakeError('アップロードが完了しませんでした。同じ内容のまま再試行できます。', 503)
    }
    const published = await db.from('cares_brochures').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user).eq('status', 'uploading').select('id')
    if (published.error) throw new Error('publish failed')
    if (!published.data?.length) {
      const state = await db.from('cares_brochures').select('status').eq('id', id).single()
      if (state.error || state.data?.status !== 'published') throw new IntakeError('資料の公開状態が変わりました。Myアクションをご確認ください。', 409)
    }
    return intakeResponse({ id }, 201)
  } catch (error) { return intakeFailure(error) }
}
