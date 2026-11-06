// Generated from CareSpace OS src/lib/availability-calendar.ts; run scripts/sync-availability-contract.cjs.
/** Shared OS/Cares availability contract. No framework, timezone or UI dependencies. */
export const AVAILABILITY_STATUS_LABELS = {
  available: '受入可能', conditional: '条件付きで相談可能', unavailable: '現在は受入困難', unknown: '未確認・要再確認', closed: '休業',
} as const
export type AvailabilityStatus = Exclude<keyof typeof AVAILABILITY_STATUS_LABELS, 'closed'>
export type SlotStatus = keyof typeof AVAILABILITY_STATUS_LABELS
export type CalendarFormat = 'day' | 'visit' | 'shortStay' | 'residential' | 'consultation' | 'multifunction'
export type CalendarSlot = {
  id: string; component: 'day' | 'visit' | 'overnight' | 'room' | 'consultation'; unit: string
  weekday: number | null; date: string | null; endDate: string | null
  time: string; area: string; support: string; status: SlotStatus; quantity: number | null; planned: boolean
}
export type AvailabilityCalendar = {
  schemaVersion: 1; format: CalendarFormat; effectiveFrom: string; effectiveUntil: string | null
  confirmedOn: string; validUntil: string; slots: CalendarSlot[]
}
export function availabilityCalendarComponents(format:CalendarFormat):CalendarSlot['component'][] {
  return ({day:['day'],visit:['visit'],shortStay:['overnight'],residential:['room'],consultation:['consultation'],multifunction:['day','visit','overnight']} as Record<CalendarFormat,CalendarSlot['component'][]>)[format]
}
export const CALENDAR_DAYS = ['月', '火', '水', '木', '金', '土', '日'] as const
export function availabilityToday(now = new Date()) { return new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10) }
export function calendarDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
export function addAvailabilityDays(date: string, days: number) { return new Date(Date.parse(date) + days * 86400000).toISOString().slice(0, 10) }
export function availabilityDetailsFresh(summary: {calendar?:AvailabilityCalendar;calendarEnabled?:boolean;detailConfirmation?:{confirmedOn:string;validUntil:string};managed?:boolean},today=availabilityToday()) {
  const d=(summary.calendarEnabled!==false?summary.calendar:undefined)||summary.detailConfirmation
  if(!d)return !summary.managed
  return calendarDate(d.confirmedOn)&&calendarDate(d.validUntil)&&d.confirmedOn<=today&&d.validUntil>=today&&d.validUntil<=addAvailabilityDays(d.confirmedOn,30)
}
export function availabilityDetailsVisible(summary: {calendar?:AvailabilityCalendar;calendarEnabled?:boolean;detailConfirmation?:{confirmedOn:string;validUntil:string};managed?:boolean;generalStatus?:AvailabilityStatus;generalValidUntil?:string},today=availabilityToday()) {
  return !['unavailable','unknown'].includes(summary.generalStatus || '') && (!summary.generalValidUntil||summary.generalValidUntil>=today) && availabilityDetailsFresh(summary,today)
}
export function normalizeAvailabilityStatus(value: unknown): AvailabilityStatus {
  if (['available', 'has_vacancy', 'accepting'].includes(String(value))) return 'available'
  if (['conditional', 'limited', 'consultation', 'waitlist'].includes(String(value))) return 'conditional'
  if (['unavailable', 'full', 'no_vacancy', 'not_accepting'].includes(String(value))) return 'unavailable'
  return 'unknown'
}
export function emptyAvailabilityCalendar(format: CalendarFormat, today = availabilityToday()): AvailabilityCalendar {
  return { schemaVersion: 1, format, effectiveFrom: today, effectiveUntil: null, confirmedOn: today, validUntil: addAvailabilityDays(today, 7), slots: [] }
}
export function validateAvailabilityCalendar(value: unknown): string | null {
  if (!value || typeof value !== 'object') return '空き枠の形式を確認してください。'
  const c = value as AvailabilityCalendar
  if (c.schemaVersion !== 1 || !['day','visit','shortStay','residential','consultation','multifunction'].includes(c.format)) return '空き枠の形式を確認してください。'
  if (!calendarDate(c.effectiveFrom) || (c.effectiveUntil !== null && (!calendarDate(c.effectiveUntil) || c.effectiveUntil < c.effectiveFrom))) return '適用期間を確認してください。'
  if (!calendarDate(c.confirmedOn) || !calendarDate(c.validUntil) || c.validUntil < c.confirmedOn || c.validUntil > addAvailabilityDays(c.confirmedOn, 30)) return '詳細枠の掲載期限は確認日から30日以内にしてください。'
  if (!Array.isArray(c.slots) || c.slots.length > 100) return '空き枠は100件以内で入力してください。'
  const keys = new Set<string>()
  const intervals: CalendarSlot[] = []
  for (const s of c.slots) {
    if (!s || !['day','visit','overnight','room','consultation'].includes(s.component) || !Object.hasOwn(AVAILABILITY_STATUS_LABELS, s.status)) return '空き枠の状態を確認してください。'
    if (typeof s.id !== 'string' || !s.id || ![s.unit,s.time,s.area,s.support].every(t => typeof t === 'string' && t.length <= 200) || typeof s.planned !== 'boolean') return '空き枠の入力内容を確認してください。'
    if (s.quantity !== null && (!Number.isInteger(s.quantity) || s.quantity < 0 || s.quantity > 9999)) return '人数・枠数は0以上の整数か空欄にしてください。'
    if (s.quantity === 0 && s.status === 'available') return '受入可能な枠数に0は指定できません。未定なら空欄にしてください。'
    if (s.weekday !== null && (!Number.isInteger(s.weekday) || s.weekday < 1 || s.weekday > 7)) return '曜日を確認してください。'
    if (s.date !== null && !calendarDate(s.date)) return '利用日を確認してください。'
    if (s.date && s.weekday !== null) return '定期曜日と単発の日付は分けて登録してください。'
    if (s.endDate !== null && (!calendarDate(s.endDate) || !s.date || s.endDate <= s.date)) return '終了日は開始日より後にしてください。'
    if (s.component === 'overnight' && (!s.date || !s.endDate || s.weekday !== null)) return '宿泊日と退所日を入力してください。'
    const key = [s.component,s.unit,s.weekday,s.date,s.endDate,s.time].join('|')
    if (keys.has(key)) return '同じ単位・曜日・日付・時間の枠が重複しています。'
    keys.add(key)
    if(s.date && s.endDate) {
      if(intervals.some(other=>other.component===s.component&&other.unit===s.unit&&other.time===s.time&&other.date!<s.endDate!&&s.date!<other.endDate!)) return '同じ単位・時間の利用期間が重なっています。期間を分けて入力してください。'
      intervals.push(s)
    }
  }
  return null
}
export function sanitizeAvailabilityCalendar(c: AvailabilityCalendar): AvailabilityCalendar {
  return { schemaVersion: 1, format: c.format, effectiveFrom: c.effectiveFrom, effectiveUntil: c.effectiveUntil,
    confirmedOn: c.confirmedOn, validUntil: c.validUntil, slots: c.slots.map(s => ({
      id: s.id, component: s.component, unit: s.unit, weekday: s.weekday, date: s.date, endDate: s.endDate,
      time: s.time, area: s.area, support: s.support, status: s.status, quantity: s.quantity, planned: s.planned,
    })) }
}
/** End date of an overnight interval is the checkout date, not a night. */
export function slotsForDate(c: AvailabilityCalendar, date: string, today = availabilityToday()) {
  if (!calendarDate(date) || validateAvailabilityCalendar(c) || c.confirmedOn > today || c.validUntil < today || date < c.effectiveFrom || (c.effectiveUntil && date > c.effectiveUntil)) return []
  const weekday = (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7 + 1
  const slots=c.slots.filter(s=>availabilityCalendarComponents(c.format).includes(s.component))
  const dated = slots.filter(s => s.date && s.date <= date && (s.endDate ? date < s.endDate : ['room','consultation'].includes(s.component) || s.date === date))
  const overridden = new Set(dated.map(s => [s.component,s.unit,s.time].join('|')))
  return [...slots.filter(s => s.weekday === weekday && !overridden.has([s.component,s.unit,s.time].join('|'))), ...dated]
}
export function slotCapacityText(slot: CalendarSlot) {
  const unit = slot.component === 'overnight' || slot.component === 'room' ? '床' : slot.component === 'visit' ? '枠' : slot.component === 'consultation' ? '件' : '名'
  return `${AVAILABILITY_STATUS_LABELS[slot.status]}${slot.quantity === null ? '' : `（${slot.quantity}${unit}）`}${slot.planned ? '・今後の予定' : ''}`
}
export function availabilityCalendarTable(c: AvailabilityCalendar, today = availabilityToday()) {
  const expired = c.validUntil < today || c.confirmedOn > today || Boolean(c.effectiveUntil&&c.effectiveUntil<today)
  return { title: '空き枠・受入条件', headers: ['単位・居室', '曜日・利用日', '時間・地域', '受入状況・条件'], widths: [1.5,2,2,3], rows: expired ? [['詳細枠は要再確認', '', '', '掲載期限または適用期間を過ぎています']] : c.slots.filter(s=>availabilityCalendarComponents(c.format).includes(s.component)).filter(s => !s.date || (s.endDate ? s.endDate>today : ['room','consultation'].includes(s.component)||s.date>=today)).map(s => [
    s.unit || ({day:'通い',visit:'訪問',overnight:'泊まり',room:'居室',consultation:'新規相談'}[s.component]),
    s.weekday === null ? s.date ? s.endDate ? `${s.date}〜${s.endDate}（退所日）` : s.date : '開始時期は要相談' : `毎週${CALENDAR_DAYS[s.weekday - 1]}曜日`,
    [s.time,s.area].filter(Boolean).join(' / '), [slotCapacityText(s),s.support].filter(Boolean).join(' / '),
  ]) }
}
