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

    // 個人メモ
    const { data: personalNotes, error: pError } = await supabase
      .from('cares_user_notes')
      .select(`
        listing_id,
        content,
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
      .order('updated_at', { ascending: false })

    if (pError) {
      console.error('個人メモ取得エラー:', pError)
      return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
    }

    // 専門職メモ（user_idが設定されているもの）
    const { data: professionalNotes, error: prError } = await supabase
      .from('cares_professional_notes')
      .select(`
        id,
        listing_id,
        reporter_type,
        content,
        created_at,
        cares_listings (
          id,
          facility_name,
          service_type,
          address,
          acceptance_status
        )
      `)
      .eq('user_id', user.id)
      .not('content', 'is', null)
      .order('created_at', { ascending: false })

    if (prError) {
      console.error('専門職メモ取得エラー:', prError)
      return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      personal_notes: personalNotes || [],
      professional_notes: professionalNotes || [],
    })
  } catch (error) {
    console.error('メモAPIエラー:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
