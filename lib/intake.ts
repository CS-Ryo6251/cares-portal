export const REQUEST_TYPES = { visit: '見学', trial: '体験利用', use: '利用の相談' } as const
export const INTAKE_STATUSES = { new: '未確認', reviewing: '確認中', contacted: '連絡済み', scheduled: '日程調整済み', closed: '対応完了' } as const
export const VACANCY_LABELS: Record<string, string> = { has_vacancy: '空きあり', accepting: '空きあり', no_vacancy: '空きなし', not_accepting: '空きなし', limited: '条件付きで受付', waitlist: '待機相談受付', unknown: '空き状況はご相談ください' }
export const CARE_LEVELS = ['', '未申請・不明', '申請中', '事業対象者', '要支援1', '要支援2', '要介護1', '要介護2', '要介護3', '要介護4', '要介護5']
export const FIELD_LABELS = {
  request_type: 'ご希望', applicant_name: '申込者のお名前', relationship: 'ご本人との関係',
  phone: '連絡先の電話番号', email: '連絡先のメールアドレス', client_name: '利用を希望される方のお名前',
  birth_date: '生年月日', address: 'お住まいの住所', care_level: '介護度',
  desired_dates: '希望日・曜日・回数', care_manager: '担当ケアマネジャー・所属', notes: '相談したいこと・配慮が必要なこと',
} as const
export type IntakeFields = Record<keyof typeof FIELD_LABELS, string>
export const EMPTY_FIELDS: IntakeFields = { request_type: 'trial', applicant_name: '', relationship: '', phone: '', email: '', client_name: '', birth_date: '', address: '', care_level: '', desired_dates: '', care_manager: '', notes: '' }
export const AI_FIELDS = ['client_name', 'birth_date', 'address', 'care_level', 'care_manager', 'notes'] as const
export const MAX_FILE_BYTES = 3 * 1024 * 1024
export function validId(id: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) }

export function validateFields(input: unknown): IntakeFields {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('入力内容を確認してください。')
  const source = input as Record<string, unknown>
  const fields = { ...EMPTY_FIELDS }
  for (const key of Object.keys(FIELD_LABELS) as (keyof IntakeFields)[]) {
    const value = source[key] ?? ''
    if (typeof value !== 'string' || value.length > (key === 'notes' ? 2000 : 300)) throw new Error(`${FIELD_LABELS[key]}を短く入力してください。`)
    fields[key] = value.trim()
  }
  if (!Object.hasOwn(REQUEST_TYPES, fields.request_type)) throw new Error('申込みの種類を選んでください。')
  if (!fields.applicant_name || !fields.client_name) throw new Error('申込者と利用希望者のお名前を入力してください。')
  if (!fields.phone && !fields.email) throw new Error('連絡先の電話番号またはメールアドレスを入力してください。')
  if (fields.phone && !/^\+?[\d\s()ー−-]{8,25}$/.test(fields.phone)) throw new Error('電話番号を確認してください。')
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) throw new Error('メールアドレスを確認してください。')
  if (!CARE_LEVELS.includes(fields.care_level)) throw new Error('介護度を選び直してください。')
  if (fields.birth_date) {
    const date = new Date(fields.birth_date + 'T00:00:00Z')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.birth_date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== fields.birth_date || fields.birth_date > new Date().toISOString().slice(0, 10) || fields.birth_date < '1900-01-01') throw new Error('生年月日を確認してください。')
  }
  return fields
}

// MIME is checked against the content, not the browser-supplied extension/type.
export function detectFileType(bytes: Uint8Array): string | null {
  const start = (text: string, offset = 0) => [...text].every((c, i) => bytes[offset + i] === c.charCodeAt(0))
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 137 && start('PNG\r\n\x1a\n', 1)) return 'image/png'
  if (start('RIFF') && start('WEBP', 8)) return 'image/webp'
  if (start('%PDF-')) return 'application/pdf'
  return null
}

export function parseExtraction(value: unknown): Partial<IntakeFields> {
  if (!value || typeof value !== 'object') throw new Error('読み取れませんでした。手入力をご利用ください。')
  const data = value as Record<string, unknown>
  if (data.multiple_people !== false) throw new Error('複数の方の情報が含まれる可能性があります。1人分の書類にするか、手入力してください。')
  const result: Partial<IntakeFields> = {}
  for (const key of AI_FIELDS) {
    const v = data[key]
    if (v !== null && (typeof v !== 'string' || v.length > (key === 'notes' ? 2000 : 300))) throw new Error('読み取り結果を確認できませんでした。手入力をご利用ください。')
    if (typeof v === 'string' && v.trim()) result[key] = v.trim()
  }
  if (result.care_level && !CARE_LEVELS.includes(result.care_level)) delete result.care_level
  if (result.birth_date && !/^\d{4}-\d{2}-\d{2}$/.test(result.birth_date)) delete result.birth_date
  return result
}
