import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase-server-auth'
import { UUID_PATTERN } from '@/lib/community'
const headers = { 'Cache-Control': 'private, no-store' }
async function setLike(request: NextRequest, liked: boolean) {
  try {
    if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Caresの画面から操作してください' }, { status: 403, headers })
    if (!request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ error: '送信形式が不正です' }, { status: 415, headers })
    const supabase = await createAuthServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401, headers })
    const body = await request.json().catch(() => null)
    if (!body || typeof body.post_id !== 'string' || !UUID_PATTERN.test(body.post_id)) return NextResponse.json({ error: '投稿IDが不正です' }, { status: 400, headers })
    const postId = body.post_id
    const existing = await supabase.from('facility_portal_posts').select('id,facility_id').eq('id', postId).eq('status', 'published').maybeSingle()
    if (existing.error) throw new Error('Post lookup failed')
    if (!existing.data) return NextResponse.json({ error: '公開中の投稿が見つかりません' }, { status: 404, headers })
    // Set desired state, never toggle: retries and duplicate requests are safe.
    const result = liked
      ? await supabase.from('cares_likes').upsert({ user_id: user.id, post_id: postId }, { onConflict: 'user_id,post_id', ignoreDuplicates: true })
      : await supabase.from('cares_likes').delete().eq('user_id', user.id).eq('post_id', postId)
    if (result.error) throw new Error('Like write failed')
    const count = await supabase.from('facility_portal_posts').select('like_count').eq('id', postId).maybeSingle()
    if (count.error || !count.data || !Number.isSafeInteger(count.data.like_count)) throw new Error('Count lookup failed')
    return NextResponse.json({ liked, like_count: count.data.like_count, facility_id: existing.data.facility_id }, { headers })
  } catch {
    return NextResponse.json({ error: 'いいねの結果を確認できませんでした。もう一度押して確認できます。' }, { status: 503, headers })
  }
}
export const POST = (request: NextRequest) => setLike(request, true)
export const DELETE = (request: NextRequest) => setLike(request, false)
