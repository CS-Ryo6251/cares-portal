import { availabilityDetailsFresh, availabilityCalendarTable, validateAvailabilityCalendar, type AvailabilityCalendar } from './availability-calendar'

type Table = { title: string; headers: string[]; rows: string[][] }
const text = (value: unknown) => typeof value === 'string' ? value : ''
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const days = ['月', '火', '水', '木', '金', '土', '日']
// Render only the public contract's allowed fields; never stringify unknown data.
export function publicAvailabilityTables(summary: Record<string, unknown>, serviceType = ''): Table[] {
  if (summary.calendar) return validateAvailabilityCalendar(summary.calendar)
    ? [{ title: '空き枠・受入条件', headers: ['詳細枠'], rows: [['詳細枠は要再確認']] }]
    : [availabilityCalendarTable(summary.calendar as AvailabilityCalendar)]
  if (!availabilityDetailsFresh({ ...summary, managed: true })) return [{ title: '空き枠・受入条件', headers: ['詳細枠'], rows: [['詳細枠は要再確認']] }]
  let format = text(summary.format)
  if (!format || format === 'auto') format = serviceType.includes('小規模多機能') ? 'multifunction' : serviceType.startsWith('短期入所') ? 'shortStay' : /訪問|居宅療養/.test(serviceType) ? 'visit' : /通所/.test(serviceType) ? 'day' : /入居|入所|共同生活|老人|介護医療院/.test(serviceType) ? 'residential' : 'general'
  const rows = (key: string, fields: string[]) => Array.isArray(summary[key]) ? (summary[key] as unknown[]).map(row => fields.map(field => text(object(row)[field]))).filter(row => row.some(Boolean)) : []
  const weekly = object(summary.weekly)
  const tables: Record<string, Table> = {
    day: Array.isArray(summary.dayUnits) && summary.dayUnits.length && summary.dayMode !== 'single'
      ? { title: '単位・曜日別の空き枠', headers: ['単位・時間帯', ...days], rows: summary.dayUnits.map(value => { const row = object(value); return [[text(row.name),text(row.time)].filter(Boolean).join(' / '), ...days.map(day => text(object(row.weekly)[day]))] }) }
      : { title: '曜日別の空き枠', headers: days, rows: [days.map(day => text(weekly[day]))] },
    visit: { title: '訪問できる曜日・時間帯', headers: ['曜日','時間帯','支援内容','空き枠'], rows: rows('visitSlots',['day','time','support','capacity']) },
    shortStay: { title: '短期入所の空き期間・居室', headers: ['期間','居室','空床数'], rows: rows('shortStaySlots',['period','room','capacity']) },
    residential: { title: '入所できる居室・時期', headers: ['居室','空床数','入所時期'], rows: rows('residentialSlots',['room','capacity','start']) },
    multifunction: { title: '登録枠と通い・泊まり・訪問', headers: ['サービス','受入状況'], rows: [['登録','registration'],['通い','day'],['泊まり','overnight'],['訪問','visit']].map(([label,key]) => [label,text(object(summary.multifunction)[key])]).filter(row => row[1]) },
    general: { title: '受入状況', headers: ['空き枠・期間・条件'], rows: [[text(summary.generalAvailability)]] },
  }
  const table = tables[format] || tables.general
  return table.rows.some(row => row.some(Boolean)) ? [table] : []
}

export function publicCalendarPeriod(summary: Record<string, unknown>) {
  if (!summary.calendar) {
    const confirmation = object(summary.detailConfirmation)
    return availabilityDetailsFresh({ ...summary, managed: true }) ? `詳細枠の確認日：${text(confirmation.confirmedOn)} ／ 詳細枠の掲載期限：${text(confirmation.validUntil)}` : null
  }
  if (validateAvailabilityCalendar(summary.calendar)) return null
  const calendar = summary.calendar as AvailabilityCalendar
  return `適用期間：${calendar.effectiveFrom}〜${calendar.effectiveUntil || '終了日未指定'} ／ 詳細枠の確認日：${calendar.confirmedOn} ／ 詳細枠の掲載期限：${calendar.validUntil}`
}

export function publicAvailabilityConditions(summary: Record<string, unknown>) {
  if (!availabilityDetailsFresh({ ...summary, managed: true })) return []
  return [['startTiming','開始時期'],['transport','送迎・対応範囲'],['careLevels','対象・受入条件'],['accepts','受入可能'],['consults','要相談'],['unavailable','対応できない条件']].flatMap(([key,label]) => text(summary[key]) ? [{ label, value: text(summary[key]) }] : [])
}
