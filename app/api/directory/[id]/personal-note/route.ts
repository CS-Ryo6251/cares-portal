import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { createAuthServerClient } from '@/lib/supabase-server-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const authSupabase = await createAuthServerClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ note: null })
    }

    const supabase = getSupabaseServiceClient()
    const { data, error } = await supabase
      .from('cares_user_notes')
      .select('content, updated_at')
      .eq('user_id', user.id)
      .eq('listing_id', id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      note: data ? { content: data.content, updated_at: data.updated_at } : null,
    })
  } catch {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const authSupabase = await createAuthServerClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { content } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'メモ内容を入力してください' }, { status: 400 })
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'メモは1000文字以内で入力してください' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    const { error } = await supabase
      .from('cares_user_notes')
      .upsert(
        {
          user_id: user.id,
          listing_id: id,
          content: content.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,listing_id' }
      )

    if (error) {
      console.error('Personal note upsert error:', error)
      return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Personal note API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
