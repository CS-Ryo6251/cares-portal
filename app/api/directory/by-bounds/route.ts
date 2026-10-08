import { serviceTypeValues } from '@/lib/service-types'
import { getHeartSummaries } from '@/lib/hearts'
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
    const status = params.get('status')
    const source = status === 'has_vacancy' || status === 'no_vacancy'
      ? 'cares_confirmed_directory_listing' : 'cares_directory_listing'
    let query = supabase
      .from(source)
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

    if (status) {
      const values = STATUS_MAP[status] || [status]
      query = query.in('current_acceptance_status', values)
    }

    const serviceType = params.get('service_type')
    if (serviceType) {
      query = query.in('service_type', serviceTypeValues(serviceType))
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
    const heartSummaries = await getHeartSummaries(ids)

    const facilities = rows.map((item: any) => {
      return {
        id: item.id,
        facility_name: item.facility_name,
        service_type: item.service_type,
        address: item.address,
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
        acceptance_status: item.current_acceptance_status,
        is_owner_verified: !!item.is_owner_verified,
        heart_total: heartSummaries === null ? null : (heartSummaries[item.id]?.total || '0'),
      }
    })

    return NextResponse.json({ facilities }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('by-bounds error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
