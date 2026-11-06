import { getSupabaseClient } from './supabase'

export type ProviderAvailability = {
  listing_id: string
  status: string
  provider_managed: boolean
  target_id: string | null
  version: number | null
  summary: Record<string, unknown>
  checked_at: string | null
  valid_until: string | null
  evidence: string | null
  recruitment_post_id: string | null
  recruitment_status: string | null
  published: boolean
}

export function displayAvailabilityStatus(value: string | null | undefined) {
  return ({ available: 'has_vacancy', accepting: 'has_vacancy', unavailable: 'no_vacancy', not_accepting: 'no_vacancy', limited: 'conditional', waitlist: 'conditional' } as Record<string, string>)[value || ''] || value || 'unknown'
}

export async function getListingAvailability(ids: string[]) {
  if (!ids.length) return {} as Record<string, ProviderAvailability>
  const { data, error } = await getSupabaseClient().from('cares_current_availability').select('*').in('listing_id', [...new Set(ids)])
  if (error) throw new Error('空き情報を取得できませんでした')
  return Object.fromEntries((data || []).map(row => [row.listing_id, row])) as Record<string, ProviderAvailability>
}

// Facility pages/posts can represent several services. Do not borrow the first
// listing's availability: the service must match exactly and unambiguously.
export async function getFacilityAvailability(facilityIds: string[]) {
  if (!facilityIds.length) return [] as { facility_id: string; service_type: string; availability: ProviderAvailability }[]
  const db = getSupabaseClient()
  const [listings, migrated] = await Promise.all([
    db.from('cares_listings').select('id,owner_facility_id,service_type').in('owner_facility_id', [...new Set(facilityIds)]).eq('is_owner_verified', true),
    db.from('service_availability_public').select('*').in('facility_id', [...new Set(facilityIds)]),
  ])
  if (listings.error || migrated.error) throw new Error('事業所の空き情報を取得できませんでした')
  const rows = listings.data || []
  const availability = await getListingAvailability(rows.map(row => row.id))
  const canonical = (migrated.data || []).map(row => ({ facility_id: row.facility_id as string, service_type: row.service_type as string, availability: { ...row, status: displayAvailabilityStatus(row.status), provider_managed: true } as ProviderAvailability }))
  return [...canonical, ...rows.filter(row => !canonical.some(item => item.availability.listing_id === row.id)).map(row => ({ facility_id: row.owner_facility_id as string, service_type: row.service_type as string, availability: availability[row.id] }))]

}

export function facilityAvailability(rows: Awaited<ReturnType<typeof getFacilityAvailability>>, facilityId: string, serviceType: string, legacyStatus: string) {
  const matches = rows.filter(row => row.facility_id === facilityId && row.service_type === serviceType)
  if (matches.length === 1) return matches[0].availability?.status || 'unknown'
  if (matches.length > 1) return 'unknown'
  return displayAvailabilityStatus(legacyStatus)
}

/** Preserve joins and private-list ordering while replacing every stale badge. */
export async function withCurrentListingStatus<T extends { listing_id: string; cares_listings: unknown }>(rows: T[]): Promise<T[]> {
  const availability = await getListingAvailability(rows.map(row => row.listing_id))
  return rows.map(row => ({ ...row, cares_listings: Array.isArray(row.cares_listings)
    ? row.cares_listings.map(listing => ({ ...listing, acceptance_status: availability[row.listing_id]?.status || 'unknown' }))
    : row.cares_listings ? { ...row.cares_listings, acceptance_status: availability[row.listing_id]?.status || 'unknown' } : null })) as T[]
}
