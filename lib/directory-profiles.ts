import { getSupabaseClient } from './supabase'

type LinkedListing = { owner_facility_id?: string | null; is_owner_verified?: boolean | null }
type DirectoryProfile = { cover_image_url: string | null; overview: string | null }

export async function getDirectoryProfiles(listings: LinkedListing[]): Promise<Record<string, DirectoryProfile>> {
  const ids = [...new Set(listings.filter(row => row.is_owner_verified && row.owner_facility_id).map(row => row.owner_facility_id!))]
  if (!ids.length) return {}
  // Use reader RLS as well as publication status. Never fetch private profile fields.
  const { data, error } = await getSupabaseClient().from('facility_portal_profiles')
    .select('facility_id,cover_image_url,overview').in('facility_id', ids).eq('is_published', true)
  if (error) return {}
  return Object.fromEntries((data || []).map(profile => [profile.facility_id, { cover_image_url: profile.cover_image_url, overview: profile.overview }]))
}

export function directoryProfile(listing: LinkedListing, profiles: Record<string, DirectoryProfile>) {
  return listing.is_owner_verified && listing.owner_facility_id ? profiles[listing.owner_facility_id] : undefined
}
