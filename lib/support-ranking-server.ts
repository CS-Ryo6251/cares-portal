import { serviceTypeValues } from './service-types'
import 'server-only'
import { unstable_cache } from 'next/cache'
import { getSupabaseServiceClient } from './supabase'
import { readSupportRanking, type RankingFilters } from './support-ranking'

const loadRanking = unstable_cache(async (period: string, prefecture: string, service: string) => {
  const { data, error } = await getSupabaseServiceClient().rpc('cares_support_ranking_for_services', {
    p_period: period, p_prefecture: prefecture, p_service_types: service ? serviceTypeValues(service) : [],
  })
  if (error) throw new Error('Ranking unavailable')
  const ranking = readSupportRanking(data)
  if (!ranking || ranking.period !== period) throw new Error('Invalid ranking')
  return ranking
}, ['cares-support-ranking-v2'], { revalidate: 60 })

export async function getSupportRanking(filters: RankingFilters) {
  try { return await loadRanking(filters.period, filters.prefecture, filters.service) }
  catch { return null }
}
