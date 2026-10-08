export const BROCHURE_MAX_BYTES = 3 * 1024 * 1024
export const BROCHURE_MAX_FILES = 3
export type Brochure = {
  id: string; listingId: string; facilityName: string; title: string; note: string
  issuedMonth: string | null; createdAt: string; updatedAt: string
  status: 'uploading' | 'published' | 'hidden' | 'deleted'; mine: boolean
  files: { index: number; mime: string; size: number }[]
  helpfulCount: number; helpful: boolean; saved: boolean
}
export type BrochureList = { items: Brochure[]; hasMore: boolean; nextOffset: number; authenticated?: boolean; summary: { shared: number; saved: number; helpful: number } | null }
export function brochureMetadata(input: Record<string, unknown>) {
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 100) throw new Error('タイトルを100文字以内で入力してください。')
  if (typeof input.note !== 'string' || input.note.length > 300) throw new Error('補足は300文字以内で入力してください。')
  const issued = input.issuedMonth
  if (typeof issued !== 'string' || (issued && (!/^\d{4}-(0[1-9]|1[0-2])$/.test(issued) || issued < '1900-01' || issued > new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit' }).format(new Date())))) throw new Error('発行年月を確認してください。不明な場合は空欄にできます。')
  return { title: input.title.trim(), note: input.note.trim(), issued_month: issued || null }
}
export function brochureDate(value: string) { return new Date(value).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' }) }
