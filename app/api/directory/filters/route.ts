import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export const revalidate = 86400

export async function GET() {
  try {
    const supabase = getSupabaseClient()

    // Fetch distinct prefectures
    const { data: prefectureData, error: prefError } = await supabase
      .from('cares_listings')
      .select('prefecture')
      .not('prefecture', 'is', null)
      .order('prefecture')

    if (prefError) {
      console.error('Filter prefectures error:', prefError)
      return NextResponse.json({ error: 'フィルターの取得に失敗しました' }, { status: 500 })
    }

    // Fetch distinct service_types
    const { data: serviceData, error: serviceError } = await supabase
      .from('cares_listings')
      .select('service_type')
      .not('service_type', 'is', null)
      .order('service_type')

    if (serviceError) {
      console.error('Filter service_types error:', serviceError)
      return NextResponse.json({ error: 'フィルターの取得に失敗しました' }, { status: 500 })
    }

    const prefectures = [...new Set((prefectureData || []).map(r => r.prefecture).filter(Boolean))]
    const service_types = [...new Set((serviceData || []).map(r => r.service_type).filter(Boolean))]

    const response = NextResponse.json({ prefectures, service_types })
    response.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400')
    return response
  } catch (error) {
    console.error('Filters API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
