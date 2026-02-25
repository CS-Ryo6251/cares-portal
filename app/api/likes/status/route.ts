import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase-server-auth'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ liked_ids: [] })
    }

    const postIdsParam = request.nextUrl.searchParams.get('post_ids')
    if (!postIdsParam) {
      return NextResponse.json({ liked_ids: [] })
    }

    const postIds = postIdsParam.split(',').filter(Boolean)
    if (postIds.length === 0) {
      return NextResponse.json({ liked_ids: [] })
    }

    const { data, error } = await supabase
      .from('cares_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds)

    if (error) {
      console.error('Like status error:', error)
      return NextResponse.json({ liked_ids: [] })
    }

    const likedIds = (data || []).map((row) => row.post_id)
    return NextResponse.json({ liked_ids: likedIds })
  } catch (error) {
    console.error('Like status API error:', error)
    return NextResponse.json({ liked_ids: [] })
  }
}
