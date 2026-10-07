export type Tariff = {
  code: string; name: string; units: number; limitUnits: number
  frequency: string; monthly: boolean; rate: number | null; addonGroup: string
  limitExcluded: boolean; care: number; group: string; duration: string
}
export type Fee = {
  id: string; category: string | null; item_name: string; amount: number | null
  care_level: string | null; notes: string | null; sort_order: number | null
  billing_unit: string | null; fee_section: string | null; amount_max: number | null
  is_optional: boolean | null; created_at?: string | null; updated_at?: string | null
}
export type AmountRange = { min: number; max: number }
export const billingLabels: Record<string, string> = { monthly: '月', daily: '日', per_use: '回', per_meal: '食', per_hour: '時間', one_time: '一括' }
export const careLimits: Record<number, number> = { 1: 16765, 2: 19705, 3: 27048, 4: 30938, 5: 36217 }
const prices: Record<string, number[]> = {
  '45': [10.9, 10.72, 10.68, 10.54, 10.45, 10.27, 10.14, 10],
  '55': [11.1, 10.88, 10.83, 10.66, 10.55, 10.33, 10.17, 10],
  '70': [11.4, 11.12, 11.05, 10.84, 10.7, 10.42, 10.21, 10],
}
export function unitPrice(prefix: string, area: string) {
  const band = ['15','78'].includes(prefix) ? '45' : ['14','16'].includes(prefix) ? '55' : ['11','12','13'].includes(prefix) ? '70' : null
  const i = area === 'other' ? 7 : /^[1-7]$/.test(area) ? Number(area) - 1 : -1
  return band && i >= 0 ? prices[band][i] : null
}
export function frequencyCount(mode: string, count: number) {
  if (!['weekly','monthly'].includes(mode) || !Number.isInteger(count) || count < 0 || count > (mode === 'weekly' ? 21 : 999)) return null
  return mode === 'weekly' ? Math.round(count * 4.3) : count
}
export function insuranceEstimate(base: { tariff: Tariff; count: number }[], addons: { tariff: Tariff; count: number }[], price: number, burden: number) {
  if (!base.length || ![1,2,3].includes(burden) || !Number.isFinite(price) || price < 10 || price > 11.4) return null
  const lines = [...base, ...addons]
  if (lines.some(x => !Number.isInteger(x.count) || x.count < 0 || x.count > 999)) return null
  if (new Set(lines.map(x => x.tariff.code.slice(0, 2))).size !== 1) return null
  const fixed = lines.filter(x => x.tariff.rate === null).map(x => ({ ...x, totalUnits: x.tariff.units * (x.tariff.monthly ? Number(x.count > 0) : x.count) }))
  const fixedUnits = fixed.reduce((n,x) => n + x.totalUnits, 0)
  const rates = lines.filter(x => x.tariff.rate !== null)
  if (rates.length > 1) return null
  const rateUnits = rates.reduce((n,x) => n + (x.count > 0 ? Math.round(fixedUnits * Math.round((x.tariff.rate || 0) * 1000) / 1000) : 0), 0)
  const units = fixedUnits + rateUnits
  // Decimal unit prices are converted to integer sen before flooring once per service/month.
  const cost = Math.floor(units * Math.round(price * 100) / 100)
  const insurance = Math.floor(cost * (10 - burden) / 10)
  const limitUnits = fixed.reduce((n,x) => n + (x.tariff.limitExcluded ? 0 : x.tariff.limitUnits * (x.tariff.monthly ? Number(x.count > 0) : x.count)), 0)
  return { units, fixedUnits, rateUnits, cost, insurance, selfPay: cost - insurance, limitUnits, lines: fixed }
}
export function amountRange(fee: Fee): AmountRange | null {
  const a = fee.amount ?? fee.amount_max, b = fee.amount_max ?? fee.amount
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) return null
  return { min: Math.min(a,b), max: Math.max(a,b) }
}
export function formatYen(range: AmountRange | null) {
  if (!range) return '要確認'
  return range.min === range.max ? `${range.min.toLocaleString('ja-JP')}円` : `${range.min.toLocaleString('ja-JP')}〜${range.max.toLocaleString('ja-JP')}円`
}
export function providerFeeTotal(fees: Fee[], options: { care: string; visits: number; days: number; meals: number; hours: number; quantities: Record<string, number>; selected: string[]; burden: number }) {
  const rows = fees.filter(f => (!f.care_level || f.care_level === options.care) && (!(f.is_optional ?? f.category === 'option') || options.selected.includes(f.id))).map(fee => {
    const unit = fee.billing_unit || 'monthly'
    const quantity = options.quantities[fee.id] ?? ({ monthly: 1, daily: options.days, per_use: options.visits, per_meal: options.days * options.meals, per_hour: options.hours * options.visits, one_time: 1 } as Record<string,number>)[unit]
    const base = amountRange(fee)
    const ratio = fee.fee_section === 'insurance_estimate' ? options.burden : 1
    const validQuantity = Number.isFinite(quantity) && quantity >= 0 && quantity <= 100000 && (unit === 'per_hour' || Number.isInteger(quantity))
    const range = base && validQuantity ? { min: Math.round(base.min * quantity * ratio), max: Math.round(base.max * quantity * ratio) } : null
    return { fee, quantity, range, initial: fee.fee_section === 'initial_cost' || unit === 'one_time' }
  })
  const monthly = rows.filter(r => !r.initial)
  const total = monthly.reduce((n,r) => ({ min: n.min + (r.range?.min || 0), max: n.max + (r.range?.max || 0) }), { min: 0, max: 0 })
  return { rows, total, unknown: monthly.filter(r => r.range === null) }
}
