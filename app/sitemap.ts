import type { MetadataRoute } from 'next'
import { getSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 86400 // 24 hours

const BASE_URL = 'https://cares.carespace.jp'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getSupabaseClient()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/directory`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/directory/add`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/for-business`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ]

  // Recently updated facility pages (most important for indexing)
  const { data } = await supabase
    .from('cares_listings')
    .select('id, updated_at')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(5000)

  const facilityPages: MetadataRoute.Sitemap = (data || []).map((listing) => ({
    url: `${BASE_URL}/directory/${listing.id}`,
    lastModified: listing.updated_at ? new Date(listing.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...facilityPages]
}
