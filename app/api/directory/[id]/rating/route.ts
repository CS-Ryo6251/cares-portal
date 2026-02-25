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
      return NextResponse.json({ rating: null })
    }

    const supabase = getSupabaseServiceClient()
    const { data, error } = await supabase
      .from('cares_user_ratings')
      .select('rating')
      .eq('user_id', user.id)
      .eq('listing_id', id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ rating: data?.rating ?? null })
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
    const { rating } = body

    if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: '評価は1〜5の整数で入力してください' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    const { error } = await supabase
      .from('cares_user_ratings')
      .upsert(
        {
          user_id: user.id,
          listing_id: id,
          rating,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,listing_id' }
      )

    if (error) {
      console.error('Rating upsert error:', error)
      return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, rating })
  } catch (error) {
    console.error('Rating API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

export async function DELETE(
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

    const supabase = getSupabaseServiceClient()

    const { error } = await supabase
      .from('cares_user_ratings')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', id)

    if (error) {
      console.error('Rating delete error:', error)
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, rating: null })
  } catch (error) {
    console.error('Rating API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
