import { randomBytes } from 'node:crypto'
import { LIST_ID, LIST_MAX_ITEMS, listEntries, listSnapshot, listText } from '@/lib/personal-lists'
import { LIST_COLUMNS, listBody, listFacilities, listInput, listUser, listVersion, ownedList, validateNewEntries } from '@/lib/personal-lists-server'
import { IntakeError, intakeFailure, intakeResponse, sameOrigin, takeLimit } from '@/lib/intake-server'
import { getSupabaseServiceClient } from '@/lib/supabase'

type Context = { params: Promise<{ id: string }> }
export async function GET(_request: Request, context: Context) {
  try {
    const list = await ownedList(await listUser(), (await context.params).id)
    return intakeResponse({ list, facilities: await listFacilities(list.entries.map(item => item.listing_id)) })
  } catch (error) { return intakeFailure(error) }
}
export async function PATCH(request: Request, context: Context) {
  try {
    sameOrigin(request)
    const user = await listUser(), id = (await context.params).id, body = await listBody(request)
    const list = await ownedList(user, id)
    // Adding the same facility twice is safe, including a retry after a lost response.
    if (body.action === 'add' && typeof body.listing_id === 'string' && list.entries.some(item => item.listing_id === (body.listing_id as string).toLowerCase())) return intakeResponse({ list })
    listVersion(body.version, list.version)
    let changes: Record<string, unknown>
    if (body.action === 'save') {
      const entries = listInput(() => listEntries(body.entries))
      await validateNewEntries(entries, list.entries)
      changes = { title: listInput(() => listText(body.title, 80, 'リスト名', true)), entries }
    } else if (body.action === 'add') {
      if (typeof body.listing_id !== 'string' || !LIST_ID.test(body.listing_id)) throw new IntakeError('事業所を選び直してください。')
      if (list.entries.length >= LIST_MAX_ITEMS) throw new IntakeError(`1つのリストには${LIST_MAX_ITEMS}件まで追加できます。`)
      const entries = [...list.entries, { listing_id: body.listing_id.toLowerCase(), private_note: '', public_note: '' }]
      await validateNewEntries(entries, list.entries)
      changes = { entries }
    } else if (body.action === 'share') {
      const snapshot = listInput(() => listSnapshot(list, body.title, body.intro))
      await validateNewEntries(list.entries)
      changes = { share_token: list.share_token || randomBytes(32).toString('hex'), share_snapshot: snapshot, shared_version: list.version + 1 }
    } else if (body.action === 'unshare') {
      changes = { share_token: null, share_snapshot: null, shared_version: null }
    } else throw new IntakeError('操作を選び直してください。')
    await takeLimit(`personal-lists-edit:${user}`, 300, 3600)
    const { data, error } = await getSupabaseServiceClient().from('cares_personal_lists').update({ ...changes, version: list.version + 1, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user).eq('version', list.version).select(LIST_COLUMNS).maybeSingle()
    if (error) throw new Error('list save failed')
    if (!data) throw new IntakeError('別の画面で変更されています。入力内容を控え、最新のリストを読み込んでください。', 409)
    return intakeResponse({ list: data })
  } catch (error) { return intakeFailure(error) }
}
export async function DELETE(request: Request, context: Context) {
  try {
    sameOrigin(request)
    const user = await listUser(), id = (await context.params).id, body = await listBody(request)
    const list = await ownedList(user, id)
    listVersion(body.version, list.version)
    const { data, error } = await getSupabaseServiceClient().from('cares_personal_lists').delete().eq('id', id).eq('user_id', user).eq('version', list.version).select('id')
    if (error) throw new Error('list deletion failed')
    if (!data?.length) throw new IntakeError('別の画面で変更されています。最新のリストを読み込んでください。', 409)
    return intakeResponse({ deleted: true })
  } catch (error) { return intakeFailure(error) }
}
