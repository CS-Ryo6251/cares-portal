export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const VACANCY_SOURCES = {
  facility_fax: '事業所からのFAX',
  facility_phone: '事業所への電話確認',
  facility_email: '事業所からのメール',
  facility_website: '事業所の公開情報',
  visit: '見学・訪問時の確認',
  other: 'その他の確認',
} as const

export function japanDate(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}

export function validateVacancy(body: Record<string, unknown>, today = japanDate()) {
  if (!['has_vacancy', 'no_vacancy', 'unknown'].includes(String(body.vacancy_type))) return '空き状況を選択してください'
  if (typeof body.information_source !== 'string' || !Object.prototype.hasOwnProperty.call(VACANCY_SOURCES, body.information_source)) return '情報源を選択してください'
  if (!validDate(body.confirmed_on) || body.confirmed_on > today) return '確認日は今日以前の正しい日付にしてください'
  if (!validDate(body.valid_until) || body.valid_until < today || body.valid_until < body.confirmed_on) return '掲載期限は今日・確認日以降にしてください'
  if (Date.parse(body.valid_until) - Date.parse(body.confirmed_on) > 30 * 86400000) return '掲載期限は確認日から30日以内にしてください'
  if (body.comment != null && (typeof body.comment !== 'string' || body.comment.length > 200)) return '受入条件は200文字以内で入力してください'
  if (body.publication_confirmed !== true) return '公開してよい情報であることを確認してください'
  return null
}

export type VacancyReport = {
  vacancy_type: string
  information_source?: string | null
  confirmed_on?: string | null
  valid_until?: string | null
  reported_at: string
  comment?: string | null
}

export function currentVacancy(reports: VacancyReport[], today = japanDate()) {
  // A newer expired/unknown report supersedes older reports; never resurrect an old vacancy.
  const latest = [...reports].sort((a, b) =>
    (b.confirmed_on || '').localeCompare(a.confirmed_on || '') || b.reported_at.localeCompare(a.reported_at)
  )[0]
  if (!latest || !validDate(latest.confirmed_on) || !validDate(latest.valid_until)
    || latest.confirmed_on > today || latest.valid_until < today) return null
  return latest
}

export function formatHearts(value: string | null | undefined) {
  return value != null && /^\d+$/.test(value) ? BigInt(value).toLocaleString('ja-JP') : '—'
}

/** Compact display only: retain the exact decimal string for counts and accessibility. */
export function compactHearts(value: string | null | undefined) {
  if (value == null || !/^\d+$/.test(value)) return '—'
  const digits = value.replace(/^0+(?=\d)/, '')
  if (digits.length <= 4) return formatHearts(digits)
  const units = ['', '万', '億', '兆', '京', '垓', '秭', '穣', '溝', '澗', '正', '載', '極']
  const group = Math.floor((digits.length - 1) / 4)
  if (group >= units.length) return `${digits[0]}.${digits[1]} × 10^${digits.length - 1}`
  const whole = digits.slice(0, digits.length - group * 4)
  const decimal = digits[whole.length]
  return `${whole}${decimal !== '0' ? `.${decimal}` : ''}${units[group]}`
}
