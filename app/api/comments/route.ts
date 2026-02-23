import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseServiceClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('post_id')

    if (!postId) {
      return NextResponse.json({ error: 'post_id is required' }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    const { data: comments, error } = await supabase
      .from('facility_portal_post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) {
      console.error('Comments fetch error:', error)
      return NextResponse.json({ error: 'コメントの取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ comments: comments || [] })
  } catch (error) {
    console.error('Comments API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { post_id, facility_id, commenter_name, comment_text } = body

    if (!post_id || !facility_id || !commenter_name || !comment_text) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
    }

    if (commenter_name.length > 50) {
      return NextResponse.json({ error: 'お名前は50文字以内で入力してください' }, { status: 400 })
    }

    if (comment_text.length > 500) {
      return NextResponse.json({ error: 'コメントは500文字以内で入力してください' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    const { data, error } = await supabase
      .from('facility_portal_post_comments')
      .insert({
        post_id,
        facility_id,
        commenter_name,
        comment_text,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Comment insert error:', error)
      return NextResponse.json({ error: 'コメントの投稿に失敗しました' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Comments POST error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
