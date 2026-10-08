export const LIST_MAX_ITEMS = 30
export const LIST_KINDS = { candidates: '利用者ごとの候補', recommendations: '自分のおすすめランキング' } as const
export type ListKind = keyof typeof LIST_KINDS
export type ListEntry = { listing_id: string; private_note: string; public_note: string }
export type ListSnapshot = { title: string; intro: string; entries: { listing_id: string; comment: string }[] }
export type PersonalList = {
  id: string; kind: ListKind; title: string; entries: ListEntry[]; version: number; updated_at: string
  share_token: string | null; share_snapshot: ListSnapshot | null; shared_version: number | null
}
export type ListSummary = Pick<PersonalList, 'id' | 'kind' | 'title' | 'version' | 'updated_at'> & { listing_ids: string[]; shared: boolean }
export type ListFacility = { id: string; name: string; service_type: string | null; address: string | null; phone: string | null; cover: string | null; overview: string | null }
export const LIST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const SHARE_TOKEN = /^[0-9a-f]{64}$/

export function listText(value: unknown, max: number, label: string, required = false): string {
  if (typeof value !== 'string' || value.length > max) throw new Error(`${label}は${max}文字以内で入力してください。`)
  const text = value.trim()
  if (required && !text) throw new Error(`${label}を入力してください。`)
  return text
}
export function listEntries(value: unknown): ListEntry[] {
  if (!Array.isArray(value) || value.length > LIST_MAX_ITEMS) throw new Error(`1つのリストには${LIST_MAX_ITEMS}件まで追加できます。`)
  const ids = new Set<string>()
  return value.map(item => {
    if (!item || typeof item !== 'object' || typeof item.listing_id !== 'string' || !LIST_ID.test(item.listing_id)) throw new Error('事業所を選び直してください。')
    const id = item.listing_id.toLowerCase()
    if (ids.has(id)) throw new Error('同じ事業所が重複しています。')
    ids.add(id)
    return { listing_id: id, private_note: listText(item.private_note, 1000, '自分用メモ'), public_note: listText(item.public_note, 300, '紹介コメント') }
  })
}
export function listSnapshot(list: Pick<PersonalList, 'kind' | 'entries'>, title: unknown, intro: unknown): ListSnapshot {
  if (list.kind !== 'candidates') throw new Error('自分のおすすめは非公開です。候補リストにコピーしてから共有してください。')
  if (!list.entries.length) throw new Error('共有する事業所を追加してください。')
  // Explicit allowlist: never copy the internal title, private notes, owner, or ranking metadata.
  return { title: listText(title, 80, '共有用の見出し', true), intro: listText(intro, 500, '共有用の説明'), entries: list.entries.map(item => ({ listing_id: item.listing_id, comment: item.public_note })) }
}
export function listSummary(list: PersonalList): ListSummary {
  return { id: list.id, kind: list.kind, title: list.title, version: list.version, updated_at: list.updated_at, listing_ids: list.entries.map(item => item.listing_id), shared: Boolean(list.share_token) }
}
export function copiedEntries(entries: ListEntry[], ids: unknown): ListEntry[] {
  if (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== 'string' || !LIST_ID.test(id))) throw new Error('コピーする事業所を選んでください。')
  const selected = new Set(ids.map(id => id.toLowerCase()))
  const copied = entries.filter(item => selected.has(item.listing_id))
  if (selected.size !== ids.length || copied.length !== selected.size) throw new Error('コピー元の内容が変わりました。再読み込みしてください。')
  // Keep useful private experience, but don't carry a previous recipient's introduction forward.
  return copied.map(item => ({ ...item, public_note: '' }))
}
