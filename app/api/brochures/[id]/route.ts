import { brochureMetadata } from '@/lib/brochures'
import { BROCHURE_BUCKET, brochureList, brochureUser } from '@/lib/brochures-server'
import { validId } from '@/lib/intake'
import { IntakeError, intakeFailure, intakeJson, intakeResponse, sameOrigin, takeLimit } from '@/lib/intake-server'
import { getSupabaseServiceClient } from '@/lib/supabase'

type Context = { params: Promise<{ id: string }> }
async function getId(context: Context) {
  const { id } = await context.params
  if (!validId(id)) throw new IntakeError('資料が見つかりません。', 404)
  return id
}
export async function GET(_request: Request, context: Context) {
  try {
    const id = await getId(context), user = await brochureUser()
    const list = await brochureList({ id, user })
    if (!list.items.length) throw new IntakeError('この資料は公開されていません。', 404)
    return intakeResponse(list.items[0])
  } catch (error) { return intakeFailure(error) }
}
export async function PATCH(request: Request, context: Context) {
  try {
    sameOrigin(request)
    const user = (await brochureUser(true))!, id = await getId(context)
    const body = await intakeJson(request)
    const db = getSupabaseServiceClient()
    await takeLimit(`brochures-action:${user}`, 120, 3600)
    if (body.action === 'edit') {
      let metadata
      try { metadata = brochureMetadata(body) } catch (error) { throw new IntakeError((error as Error).message) }
      const edited = await db.from('cares_brochures').update({ ...metadata, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user).eq('status', 'published').select('id')
      if (edited.error) throw new Error('edit failed')
      if (!edited.data?.length) throw new IntakeError('自分が共有した公開中の資料だけ編集できます。', 403)
    } else if (body.action === 'saved' || body.action === 'helpful') {
      if (typeof body.enabled !== 'boolean') throw new IntakeError('操作を確認してください。')
      const result = await db.rpc('cares_brochure_action', { p_id: id, p_user: user, p_kind: body.action, p_enabled: body.enabled })
      if (result.error) throw new IntakeError('この資料には操作できません。公開状態をご確認ください。', 409)
    } else if (body.action === 'report') {
      if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 300) throw new IntakeError('報告内容を300文字以内で入力してください。')
      await takeLimit(`brochures-report:${user}`, 10, 86400)
      const result = await db.rpc('cares_brochure_report', { p_id: id, p_user: user, p_reason: body.reason })
      if (result.error) throw new IntakeError('この資料には報告できません。公開状態をご確認ください。', 409)
    } else throw new IntakeError('操作を確認してください。')
    return intakeResponse({ success: true })
  } catch (error) { return intakeFailure(error) }
}
export async function DELETE(request: Request, context: Context) {
  try {
    sameOrigin(request)
    const user = (await brochureUser(true))!, id = await getId(context)
    const db = getSupabaseServiceClient()
    // Hide before removing files. Retain the row for safe retries after storage timeouts.
    const hidden = await db.from('cares_brochures').update({ status: 'deleted', updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user).select('files')
    if (hidden.error) throw new Error('delete failed')
    if (!hidden.data?.length) throw new IntakeError('自分が共有した資料だけ削除できます。', 403)
    const paths = (hidden.data[0].files as { path: string }[]).map(file => file.path)
    const removed = await db.storage.from(BROCHURE_BUCKET).remove(paths)
    if (removed.error) throw new IntakeError('資料を非公開にしました。ファイル削除を完了するため、もう一度削除を押してください。', 503)
    return intakeResponse({ success: true })
  } catch (error) { return intakeFailure(error) }
}
