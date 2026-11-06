import { applyDirectoryScheme } from '@/lib/directory-scheme'
import { getListingAvailability } from '@/lib/provider-availability'
import { serviceTypeValues } from '@/lib/service-types'
import { getHeartSummaries } from '@/lib/hearts'
import { getCurrentVacancies } from '@/lib/vacancies'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const prefecture = searchParams.get('prefecture')
    const city = searchParams.get('city')
    const service_type = searchParams.get('service_type')
    const acceptance_status = searchParams.get('acceptance_status')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    const supabase = getSupabaseClient()
    const normalizedStatus = ({ accepting: 'has_vacancy', not_accepting: 'no_vacancy', limited: 'conditional', waitlist: 'conditional', available: 'has_vacancy', unavailable: 'no_vacancy' } as Record<string, string>)[acceptance_status || ''] || acceptance_status
    const source = normalizedStatus === 'has_vacancy' || normalizedStatus === 'conditional' || normalizedStatus === 'no_vacancy'
      ? 'cares_confirmed_directory_listing' : 'cares_directory_listing'

    let query = supabase
      .from(source)
      .select('*', { count: 'exact' })

    query = applyDirectoryScheme(query, searchParams.get('scheme'))
    if (q) {
      query = query.or(`facility_name.ilike.%${q}%,address.ilike.%${q}%`)
    }
    if (prefecture) {
      query = query.eq('prefecture', prefecture)
    }
    if (city) {
      query = query.eq('city', city)
    }
    if (service_type) {
      query = query.in('service_type', serviceTypeValues(service_type))
    }
    if (acceptance_status) {
      query = query.eq('current_acceptance_status', normalizedStatus)
    }

    query = query.order('facility_name', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data: facilities, error, count } = await query

    if (error) {
      console.error('Directory search error:', error)
      return NextResponse.json({ error: '検索に失敗しました' }, { status: 500 })
    }

    const facilityIds = (facilities || []).map(f => f.id)
    const [hearts, vacancies, availability] = await Promise.all([getHeartSummaries(facilityIds), getCurrentVacancies(facilityIds), getListingAvailability(facilityIds)])
    const facilitiesWithVacancy = (facilities || []).map(f => ({
      ...f,
      acceptance_status: availability[f.id]?.status || f.current_acceptance_status,
      current_vacancy: availability[f.id]?.provider_managed ? null : vacancies?.[f.id] || null,
      availability: availability[f.id],
      heart_total: hearts === null ? null : (hearts[f.id]?.total || '0'),
    }))

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    const response = NextResponse.json({
      facilities: facilitiesWithVacancy,
      total,
      page,
      totalPages,
    })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    console.error('Directory API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
