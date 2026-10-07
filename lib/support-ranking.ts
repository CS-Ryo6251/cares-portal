import { prefectures, facilityTypeLabels } from './constants'

export type RankingFilters = { period: 'week' | 'all'; prefecture: string; service: string }
export type RankingItem = {
  id: string; name: string; serviceType: string; prefecture: string | null; address: string | null
  coverImage: string | null; overview: string | null; rank: number; total: string; direct: string; posts: string
}
export type SupportRanking = { period: 'week' | 'all'; asOf: string; periodStart: string | null; items: RankingItem[] }

export function rankingFilters(params: Record<string, string | string[] | undefined>): RankingFilters {
  const first = (key: string) => Array.isArray(params[key]) ? params[key][0] : params[key]
  const area = first('prefecture') || '', service = first('service_type') || ''
  return {
    period: first('period') === 'all' ? 'all' : 'week',
    prefecture: prefectures.some(value => value === area) ? area : '',
    service: Object.hasOwn(facilityTypeLabels, service) ? service : '',
  }
}

export function rankingUrl(filters: RankingFilters) {
  const params = new URLSearchParams()
  if (filters.period === 'all') params.set('period', 'all')
  if (filters.prefecture) params.set('prefecture', filters.prefecture)
  if (filters.service) params.set('service_type', filters.service)
  return `/ranking${params.size ? `?${params}` : ''}`
}

// Reject invalid aggregates instead of showing failed reads as zero hearts.
export function readSupportRanking(value: unknown): SupportRanking | null {
  if (!value || typeof value !== 'object') return null
  const data = value as SupportRanking
  if (!['week', 'all'].includes(data.period) || typeof data.asOf !== 'string' || !Number.isFinite(Date.parse(data.asOf)) || !Array.isArray(data.items) || data.items.length > 50) return null
  if (data.period === 'week' && (typeof data.periodStart !== 'string' || !Number.isFinite(Date.parse(data.periodStart)) || Date.parse(data.periodStart) > Date.parse(data.asOf))) return null
  const ids = new Set<string>()
  for (const item of data.items) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(item.id) || ids.has(item.id)) return null
    if (typeof item.name !== 'string' || typeof item.serviceType !== 'string' || !Number.isSafeInteger(item.rank) || item.rank < 1) return null
    if ([item.address, item.prefecture, item.coverImage, item.overview].some(field => field !== null && typeof field !== 'string')) return null
    if ([item.total, item.direct, item.posts].some(count => typeof count !== 'string' || !/^\d+$/.test(count))) return null
    if (BigInt(item.total) <= BigInt(0) || BigInt(item.total) !== BigInt(item.direct) + BigInt(item.posts)) return null
    ids.add(item.id)
  }
  return data
}
