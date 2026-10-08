import { createHash } from 'node:crypto'
import { LIST_ID, LIST_KINDS, copiedEntries, listSummary, listText, type ListEntry, type ListKind, type PersonalList } from '@/lib/personal-lists'
import { LIST_COLUMNS, listBody, listInput, listUser, ownedList, validateNewEntries } from '@/lib/personal-lists-server'
import { IntakeError, intakeFailure, intakeResponse, sameOrigin, takeLimit } from '@/lib/intake-server'
import { getSupabaseServiceClient } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const user = await listUser()
    const offset = Number(new URL(request.url).searchParams.get('offset') || 0)
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw new IntakeError('表示条件を確認してください。')
    const { data, error } = await getSupabaseServiceClient().from('cares_personal_lists').select(LIST_COLUMNS).eq('user_id', user).order('created_at', { ascending: false }).order('id').range(offset, offset + 20)
    if (error) throw new Error('list lookup failed')
    return intakeResponse({ lists: (data || []).slice(0, 20).map(row => listSummary(row as PersonalList)), more: (data || []).length > 20 })
  } catch (error) { return intakeFailure(error) }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request)
    const user = await listUser(), body = await listBody(request)
    if (typeof body.id !== 'string' || !LIST_ID.test(body.id)) throw new IntakeError('画面を開き直してください。')
    if (typeof body.kind !== 'string' || !Object.hasOwn(LIST_KINDS, body.kind)) throw new IntakeError('リストの種類を選んでください。')
    const title = listInput(() => listText(body.title, 80, 'リスト名', true))
    const kind = body.kind as ListKind
    const db = getSupabaseServiceClient()
    // Retry identity uses the original request, not changing source-list content.
    const hash = createHash('sha256').update(JSON.stringify({ title, kind, listing_id: body.listing_id || null, source_id: body.source_id || null, selected_ids: body.selected_ids || null })).digest('hex')
    const existing = await db.from('cares_personal_lists').select('id,request_hash').eq('id', body.id).eq('user_id', user).maybeSingle()
    if (existing.error) throw new Error('list lookup failed')
    if (existing.data) {
      if (existing.data.request_hash !== hash) throw new IntakeError('別の内容で作成されています。リストを確認してください。', 409)
      return intakeResponse({ id: existing.data.id })
    }
    let entries: ListEntry[] = []
    if (body.source_id) {
      if (typeof body.source_id !== 'string' || kind !== 'candidates' || body.listing_id) throw new IntakeError('コピー先は候補リストを選んでください。')
      const source = await ownedList(user, body.source_id)
      entries = listInput(() => copiedEntries(source.entries, body.selected_ids))
    } else if (body.listing_id) {
      if (typeof body.listing_id !== 'string' || !LIST_ID.test(body.listing_id)) throw new IntakeError('事業所を選び直してください。')
      entries = [{ listing_id: body.listing_id.toLowerCase(), private_note: '', public_note: '' }]
    }
    await validateNewEntries(entries)
    await takeLimit(`personal-lists-create:${user}`, 100, 86400)
    const result = await db.from('cares_personal_lists').insert({ id: body.id, user_id: user, kind, title, entries, request_hash: hash })
    if (result.error) {
      if (result.error.code === '23505') {
        const retry = await db.from('cares_personal_lists').select('id,request_hash').eq('id', body.id).eq('user_id', user).maybeSingle()
        if (!retry.error && retry.data?.request_hash === hash) return intakeResponse({ id: retry.data.id })
        throw new IntakeError('リストを作成できませんでした。画面を開き直してください。', 409)
      }
      throw new Error('list creation failed')
    }
    return intakeResponse({ id: body.id }, 201)
  } catch (error) { return intakeFailure(error) }
}
