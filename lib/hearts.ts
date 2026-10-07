import { getSupabaseClient } from './supabase'

export type HeartSummary = { total: string }

export async function getHeartSummaries(ids: string[]): Promise<Record<string, HeartSummary> | null> {
  if (!ids.length) return {}
  const { data, error } = await getSupabaseClient().from('cares_listing_heart_summary')
    .select('listing_id,total').in('listing_id', ids)
  if (error) return null
  return Object.fromEntries((data || []).map(row => [row.listing_id, { total: row.total }]))
}
