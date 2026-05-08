import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

const MAX_RESULTS = 100

const STATUS_MAP: Record<string, string[]> = {
  has_vacancy: ['has_vacancy', 'accepting'],
  no_vacancy: ['no_vacancy', 'not_accepting'],
  unknown: ['unknown', 'limited', 'waitlist'],
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const north = Number(params.get('north'))
    const south = Number(params.get('south'))
    const east = Number(params.get('east'))
    const west = Number(params.get('west'))

    const valid =
      Number.isFinite(north) &&
      Number.isFinite(south) &&
      Number.isFinite(east) &&
      Number.isFinite(west) &&
      north > south &&
      east > west &&
      north <= 90 &&
      south >= -90 &&
      east <= 180 &&
      west >= -180

    if (!valid) {
      return NextResponse.json({ error: '緯度経度範囲が不正です' }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    let query = supabase
      .from('cares_listings')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .gte('latitude', south)
      .lte('latitude', north)
      .gte('longitude', west)
      .lte('longitude', east)
      .order('is_owner_verified', { ascending: false })
      .order('completeness_score', { ascending: false, nullsFirst: false })
      .limit(MAX_RESULTS)

    const status = params.get('status')
    if (status) {
      const values = STATUS_MAP[status] || [status]
      query = query.in('acceptance_status', values)
    }

    const serviceType = params.get('service_type')
    if (serviceType) {
      query = query.eq('service_type', serviceType)
    }

    const q = params.get('q')
    if (q) {
      query = query.or(`facility_name.ilike.%${q}%,address.ilike.%${q}%`)
    }

    const { data, error } = await query
    if (error) {
      console.error('by-bounds fetch error:', error)
      return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
    }

    const rows = data || []
    const ids = rows.map((row: any) => row.id)
    const ratingStats: Record<string, { sum: number; count: number }> = {}

    if (ids.length > 0) {
      const { data: ratings } = await supabase
        .from('cares_user_ratings')
        .select('listing_id, rating')
        .in('listing_id', ids)
      for (const rating of ratings || []) {
        const id = (rating as any).listing_id
        if (!ratingStats[id]) ratingStats[id] = { sum: 0, count: 0 }
        ratingStats[id].sum += Number((rating as any).rating || 0)
        ratingStats[id].count += 1
      }
    }

    const facilities = rows.map((item: any) => {
      const stats = ratingStats[item.id]
      const ratingAverage = stats?.count ? Math.round((stats.sum / stats.count) * 10) / 10 : null
      return {
        id: item.id,
        facility_name: item.facility_name,
        service_type: item.service_type,
        address: item.address,
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
        acceptance_status: item.acceptance_status,
        is_owner_verified: !!item.is_owner_verified,
        rating_average: ratingAverage,
        rating_count: stats?.count || 0,
      }
    })

    return NextResponse.json({ facilities })
  } catch (error) {
    console.error('by-bounds error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
