import { getSupabaseClient } from './supabase'
import { UUID_PATTERN } from './community'
import type { ProfilePost } from './profile-media'

// Use the public client and check both the parent page and the individual post.
// A permalink must not depend on a post still being in the newest 50 entries.
export async function getPublicPost(facilityId: string, postId: string) {
  if (!UUID_PATTERN.test(facilityId) || !UUID_PATTERN.test(postId)) return null
  const client = getSupabaseClient()
  const { data: profile, error: profileError } = await client.from('facility_portal_profiles')
    .select('facility_id,icon_url,facilities!inner(id,name)')
    .eq('facility_id', facilityId).eq('is_published', true).maybeSingle()
  if (profileError) throw new Error('公開ページを取得できませんでした')
  if (!profile) return null
  const facility = Array.isArray(profile.facilities) ? profile.facilities[0] : profile.facilities
  if (!facility) return null
  const { data: post, error: postError } = await client.from('facility_portal_posts')
    .select('id,title,content,category,created_at,like_count,media_url,media_type,link_url,facility_portal_post_media(id,media_url,media_type,sort_order)')
    .eq('id', postId).eq('facility_id', facilityId).eq('status', 'published').maybeSingle()
  if (postError) throw new Error('投稿を取得できませんでした')
  if (!post) return null
  const { data: listings, error: listingsError } = await client.from('cares_listings')
    .select('id').eq('owner_facility_id', facilityId).eq('is_owner_verified', true).order('id').limit(1)
  if (listingsError) throw new Error('応援先を取得できませんでした')
  return { facility: { id: facilityId, name: facility.name, icon: profile.icon_url }, post: post as ProfilePost, listingId: listings?.[0]?.id as string | undefined }
}
