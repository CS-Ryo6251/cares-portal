import type { SupabaseClient } from '@supabase/supabase-js'
export type FacilitySupport = {
  status: 'ready' | 'unlinked' | 'unavailable'; total: string | null; recent: string | null; asOf: string
  direct?: string; posts?: string; recentDirect?: string; recentPosts?: string
  topPosts?: { id: string; title: string; total: string; recent: string }[]
}
// Server only: callers must authorize facility membership before calling this RPC.
export async function getFacilitySupport(client: SupabaseClient, facilityId: string, now = new Date()): Promise<FacilitySupport> {
  const asOf = now.toISOString()
  try {
    const { data, error } = await client.rpc('cares_facility_support', { p_facility_id: facilityId, p_as_of: asOf })
    if (error || !data) throw new Error()
    if (data.status === 'unlinked') return { status: 'unlinked', total: null, recent: null, asOf }
    const valid = (value: unknown): value is string => typeof value === 'string' && /^\d+$/.test(value)
    if (data.status !== 'ready' || ![data.total, data.recent, data.direct, data.posts, data.recentDirect, data.recentPosts].every(valid)
      || BigInt(data.total) !== BigInt(data.direct) + BigInt(data.posts)
      || BigInt(data.recent) !== BigInt(data.recentDirect) + BigInt(data.recentPosts)
      || !Array.isArray(data.topPosts) || data.topPosts.length > 3) throw new Error()
    for (const post of data.topPosts) {
      if (typeof post.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(post.id)
        || typeof post.title !== 'string' || !valid(post.total) || !valid(post.recent)) throw new Error()
    }
    return { status: 'ready', total: data.total, recent: data.recent, direct: data.direct, posts: data.posts,
      recentDirect: data.recentDirect, recentPosts: data.recentPosts, topPosts: data.topPosts.map((post: {id: string; title: string; total: string; recent: string}) => ({ ...post, title: post.title.slice(0,120) })), asOf }
  } catch { return { status: 'unavailable', total: null, recent: null, asOf } }
}
