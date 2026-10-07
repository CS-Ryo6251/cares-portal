import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase-server-auth'
import { UUID_PATTERN } from '@/lib/community'
export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    const ids = [...new Set((request.nextUrl.searchParams.get('post_ids') || '').split(',').filter(Boolean))]
    if (!ids.length || ids.length > 50 || ids.some(id => !UUID_PATTERN.test(id))) return NextResponse.json({ error: '投稿IDが不正です' }, { status: 400, headers })
    const client = await createAuthServerClient()
    const { data: { user } } = await client.auth.getUser()
    const posts = await client.from('facility_portal_posts').select('id,like_count').in('id', ids).eq('status', 'published')
    if (posts.error) throw new Error()
    const visible = (posts.data || []).map(post => post.id)
    const likes = user && visible.length ? await client.from('cares_likes').select('post_id').eq('user_id', user.id).in('post_id', visible) : { data: [], error: null }
    if (likes.error) throw new Error()
    return NextResponse.json({ authenticated: Boolean(user), liked_ids: (likes.data || []).map(row => row.post_id), counts: Object.fromEntries((posts.data || []).map(post => [post.id, post.like_count])) }, { headers })
  } catch {
    return NextResponse.json({ error: 'いいねの状態を読み込めませんでした' }, { status: 503, headers })
  }
}
