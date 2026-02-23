import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { post_id } = await request.json()

    if (!post_id || typeof post_id !== 'string') {
      return NextResponse.json({ error: 'post_id is required' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    // Get current count and increment
    const { data: post, error: fetchError } = await supabase
      .from('facility_portal_posts')
      .select('view_count')
      .eq('id', post_id)
      .single()

    if (fetchError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('facility_portal_posts')
      .update({ view_count: (post.view_count || 0) + 1 })
      .eq('id', post_id)

    if (updateError) {
      console.error('PVカウント更新エラー:', updateError)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ success: true, view_count: (post.view_count || 0) + 1 })
  } catch (error) {
    console.error('PVカウントエラー:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
