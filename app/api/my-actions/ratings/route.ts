import { NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { createAuthServerClient } from '@/lib/supabase-server-auth'

export async function GET() {
  try {
    const authSupabase = await createAuthServerClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const supabase = getSupabaseServiceClient()
    const { data, error } = await supabase
      .from('cares_user_ratings')
      .select(`
        listing_id,
        rating,
        updated_at,
        cares_listings (
          id,
          facility_name,
          service_type,
          address,
          acceptance_status
        )
      `)
      .eq('user_id', user.id)
      .order('rating', { ascending: false })

    if (error) {
      console.error('評価一覧取得エラー:', error)
      return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ ratings: data || [] })
  } catch (error) {
    console.error('評価APIエラー:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
