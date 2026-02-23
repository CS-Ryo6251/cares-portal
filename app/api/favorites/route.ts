import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { post_id } = await request.json()

    if (!post_id || typeof post_id !== 'string') {
      return NextResponse.json({ error: 'post_id is required' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    // Get current favorite_count
    const { data: post, error: fetchError } = await supabase
      .from('facility_portal_posts')
      .select('favorite_count')
      .eq('id', post_id)
      .single()

    if (fetchError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const newCount = (post.favorite_count || 0) + 1

    const { error: updateError } = await supabase
      .from('facility_portal_posts')
      .update({ favorite_count: newCount })
      .eq('id', post_id)

    if (updateError) {
      console.error('お気に入りカウント更新エラー:', updateError)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ success: true, favorite_count: newCount })
  } catch (error) {
    console.error('お気に入りAPIエラー:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
