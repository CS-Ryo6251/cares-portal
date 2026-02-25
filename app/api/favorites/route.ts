import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase-server-auth'

export async function GET() {
  try {
    const supabase = await createAuthServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // お気に入り一覧を cares_listings と JOIN して取得
    const { data: favorites, error } = await supabase
      .from('cares_favorites')
      .select(`
        id,
        listing_id,
        notify_vacancy,
        created_at,
        cares_listings (
          id,
          facility_name,
          service_type,
          address,
          phone,
          acceptance_status,
          source
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('お気に入り取得エラー:', error)
      return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
    }

    // 各施設の専門職メモ数を取得
    const listingIds = (favorites || [])
      .map(f => f.listing_id)
      .filter(Boolean)

    let noteCounts: Record<string, number> = {}
    if (listingIds.length > 0) {
      const { data: notes } = await supabase
        .from('cares_professional_notes')
        .select('listing_id')
        .in('listing_id', listingIds)

      for (const note of notes || []) {
        noteCounts[note.listing_id] = (noteCounts[note.listing_id] || 0) + 1
      }
    }

    const result = (favorites || []).map(fav => ({
      ...fav,
      note_count: noteCounts[fav.listing_id] || 0,
    }))

    return NextResponse.json({ favorites: result })
  } catch (error) {
    console.error('お気に入りAPIエラー:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { listing_id } = await request.json()

    if (!listing_id || typeof listing_id !== 'string') {
      return NextResponse.json({ error: 'listing_id is required' }, { status: 400 })
    }

    const supabase = await createAuthServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('cares_favorites')
      .insert({
        user_id: user.id,
        listing_id,
      })
      .select()
      .single()

    if (error) {
      // UNIQUE constraint violation = already favorited
      if (error.code === '23505') {
        return NextResponse.json({ error: 'すでにお気に入りに追加済みです' }, { status: 409 })
      }
      console.error('お気に入り追加エラー:', error)
      return NextResponse.json({ error: '追加に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, favorite: data })
  } catch (error) {
    console.error('お気に入りAPIエラー:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { listing_id } = await request.json()

    if (!listing_id || typeof listing_id !== 'string') {
      return NextResponse.json({ error: 'listing_id is required' }, { status: 400 })
    }

    const supabase = await createAuthServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { error } = await supabase
      .from('cares_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listing_id)

    if (error) {
      console.error('お気に入り削除エラー:', error)
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('お気に入りAPIエラー:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
