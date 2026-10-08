import 'server-only'
import { createAuthServerClient } from './supabase-server-auth'
import { getSupabaseClient, getSupabaseServiceClient } from './supabase'
import { IntakeError, limitedBody } from './intake-server'
import { directoryProfile, getDirectoryProfiles } from './directory-profiles'
import { publicWebUrl } from './profile-media'
import { LIST_ID, SHARE_TOKEN, type ListEntry, type ListFacility, type ListSnapshot, type PersonalList } from './personal-lists'

export const LIST_COLUMNS = 'id,kind,title,entries,version,updated_at,share_token,share_snapshot,shared_version'
export async function listUser() {
  const auth = await createAuthServerClient()
  const { data: { user }, error } = await auth.auth.getUser()
  if (error || !user || user.is_anonymous) throw new IntakeError('ログインしてマイリストをご利用ください。', 401)
  return user.id
}
export async function listBody(request: Request) {
  try {
    const body = JSON.parse((await limitedBody(request, 160000)).toString('utf8'))
    if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error()
    return body as Record<string, unknown>
  } catch (error) { if (error instanceof IntakeError) throw error; throw new IntakeError('入力内容を確認してください。') }
}
export function listInput<T>(fn: () => T): T {
  try { return fn() } catch (error) { throw new IntakeError((error as Error).message) }
}
export async function ownedList(user: string, id: string): Promise<PersonalList> {
  if (!LIST_ID.test(id)) throw new IntakeError('リストが見つかりません。', 404)
  const { data, error } = await getSupabaseServiceClient().from('cares_personal_lists').select(LIST_COLUMNS).eq('id', id).eq('user_id', user).maybeSingle()
  if (error) throw new Error('list unavailable')
  if (!data) throw new IntakeError('リストが見つかりません。', 404)
  return data as PersonalList
}
export function listVersion(value: unknown, actual: number) {
  if (!Number.isSafeInteger(value) || value !== actual) throw new IntakeError('別の画面で変更されています。入力内容を控え、最新のリストを読み込んでください。', 409)
}
export async function listFacilities(ids: string[]): Promise<Record<string, ListFacility>> {
  if (!ids.length) return {}
  const { data, error } = await getSupabaseClient().from('cares_listings').select('id,facility_name,service_type,address,phone,is_owner_verified,owner_facility_id').in('id', ids)
  if (error) throw new Error('facilities unavailable')
  const profiles = await getDirectoryProfiles(data || [])
  return Object.fromEntries((data || []).map(row => {
    const profile = directoryProfile(row, profiles)
    return [row.id, { id: row.id, name: row.facility_name, service_type: row.service_type, address: row.address, phone: row.phone, cover: publicWebUrl(profile?.cover_image_url), overview: profile?.overview || null }]
  }))
}
export async function validateNewEntries(entries: ListEntry[], previous: ListEntry[] = []) {
  const existing = new Set(previous.map(item => item.listing_id))
  const added = entries.filter(item => !existing.has(item.listing_id)).map(item => item.listing_id)
  const facilities = await listFacilities(added)
  if (added.some(id => !facilities[id])) throw new IntakeError('掲載を確認できない事業所があります。選び直してください。', 409)
}
export async function sharedList(token: string) {
  if (!SHARE_TOKEN.test(token)) return null
  // This read never selects private columns. Recommendations cannot have tokens (DB constraint too).
  const { data, error } = await getSupabaseServiceClient().from('cares_personal_lists').select('share_snapshot').eq('share_token', token).eq('kind', 'candidates').maybeSingle()
  if (error) throw new Error('shared list unavailable')
  if (!data?.share_snapshot) return null
  const snapshot = data.share_snapshot as ListSnapshot
  return { ...snapshot, facilities: await listFacilities(snapshot.entries.map(item => item.listing_id)) }
}
