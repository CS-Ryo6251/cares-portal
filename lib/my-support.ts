export const SUPPORT_PERIODS = ['30d', '90d', 'all'] as const
export type SupportPeriod = (typeof SUPPORT_PERIODS)[number]
export type SupportHistory = {
  period: SupportPeriod; from: string | null; asOf: string; unit: 'day' | 'month'
  total: string; lifetimeTotal: string; facilityCount: number; activeDays: number
  timeline: { date: string; count: string }[]
  facilities: { id: string; name: string; serviceType: string | null; address: string | null; count: string; lastSentAt: string }[]
  recent: { id: string; listingId: string; name: string; at: string }[]
}

// Keep counts exact; only the bounded drawing ratio becomes a Number.
export function supportPercent(count: string, total: string) {
  const denominator = BigInt(total)
  return denominator > BigInt(0) ? Math.min(100, Number(BigInt(count) * BigInt(10000) / denominator) / 100) : 0
}

export function supportDate(value: string, month = false) {
  return new Date(value).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: month ? 'numeric' : undefined, month: 'numeric', day: month ? undefined : 'numeric' })
}
