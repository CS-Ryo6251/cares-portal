import type { SupabaseClient } from '@supabase/supabase-js'

export type FacilitySupport = {
  status: 'ready' | 'unlinked' | 'unavailable'
  total: string | null
  recent: string | null
  asOf: string
}

// Server only. The caller must authorize this facility before passing its ID.
// No visitor identifiers or individual heart events are returned to the browser.
export async function getFacilitySupport(client: SupabaseClient, facilityId: string, now = new Date()): Promise<FacilitySupport> {
  const asOf = now.toISOString()
  try {
    const listings = await client.from('cares_listings').select('id')
      .eq('owner_facility_id', facilityId).eq('is_owner_verified', true)
    if (listings.error) throw new Error('Listing lookup failed')
    const ids = (listings.data || []).map(row => row.id as string)
    if (!ids.length) return { status: 'unlinked', total: null, recent: null, asOf }
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [totals, guests, members] = await Promise.all([
      client.from('cares_listing_heart_summary').select('listing_id, total').in('listing_id', ids),
      client.from('cares_guest_heart_requests').select('*', { count: 'exact', head: true })
        .in('listing_id', ids).gte('created_at', since).lte('created_at', asOf),
      client.from('cares_listing_heart_requests').select('*', { count: 'exact', head: true })
        .in('listing_id', ids).gte('created_at', since).lte('created_at', asOf),
    ])
    if (totals.error || guests.error || members.error) throw new Error('Support lookup failed')
    let total = BigInt(0)
    for (const row of totals.data || []) {
      // The summary view exposes numeric as text, preserving arbitrarily large totals.
      if (typeof row.total !== 'string' || !/^\d+$/.test(row.total)) throw new Error('Invalid total')
      total += BigInt(row.total)
    }
    if (!Number.isSafeInteger(guests.count) || !Number.isSafeInteger(members.count)
      || guests.count! < 0 || members.count! < 0) throw new Error('Invalid recent count')
    return { status: 'ready', total: total.toString(), recent: (BigInt(guests.count!) + BigInt(members.count!)).toString(), asOf }
  } catch {
    return { status: 'unavailable', total: null, recent: null, asOf }
  }
}
