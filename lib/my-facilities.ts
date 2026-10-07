import type { SupabaseClient } from '@supabase/supabase-js'

export interface MyFacility {
  id: string
  name: string
  serviceType: string | null
  isPublished: boolean
  publicUrl: string | null
}

// Called only on the server with the verified Auth user ID, never a request ID.
export async function getMyFacilities(client: SupabaseClient, authUserId: string): Promise<MyFacility[]> {
  const { data: profile, error: profileError } = await client.from('user_profiles')
    .select('id, organization_id, is_active').eq('user_id', authUserId).maybeSingle()
  if (profileError) throw new Error('OS profile lookup failed')
  if (!profile?.organization_id || profile.is_active === false) return []

  const { data: assignments, error: assignmentError } = await client.from('user_facility_assignments')
    .select('facility_id').eq('user_id', profile.id)
  if (assignmentError) throw new Error('Facility assignment lookup failed')
  const ids = [...new Set((assignments || []).map(row => row.facility_id as string))]
  if (!ids.length) return []

  const [facilities, portals] = await Promise.all([
    client.from('facilities').select('id, name, service_type')
      .eq('organization_id', profile.organization_id).in('id', ids).order('name'),
    client.from('facility_portal_profiles').select('facility_id, is_published')
      .eq('organization_id', profile.organization_id).in('facility_id', ids),
  ])
  if (facilities.error || portals.error) throw new Error('Facility public page lookup failed')
  const published = new Set((portals.data || []).filter(row => row.is_published === true).map(row => row.facility_id))
  return (facilities.data || []).map(facility => ({
    id: facility.id,
    name: facility.name,
    serviceType: facility.service_type,
    isPublished: published.has(facility.id),
    publicUrl: published.has(facility.id) ? `https://cares.carespace.jp/facility/${facility.id}` : null,
  }))
}
