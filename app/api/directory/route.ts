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

    let query = supabase
      .from('cares_listings')
      .select('*', { count: 'exact' })

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
      query = query.eq('service_type', service_type)
    }
    if (acceptance_status) {
      query = query.eq('acceptance_status', acceptance_status)
    }

    query = query.order('facility_name', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data: facilities, error, count } = await query

    if (error) {
      console.error('Directory search error:', error)
      return NextResponse.json({ error: '検索に失敗しました' }, { status: 500 })
    }

    // Aggregate vacancy summaries for each facility
    const facilityIds = (facilities || []).map(f => f.id)
    let vacancySummaries: Record<string, { has_vacancy: number; no_vacancy: number; unknown: number; latest_report_at: string | null }> = {}

    if (facilityIds.length > 0) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: reports } = await supabase
        .from('cares_vacancy_reports')
        .select('listing_id, vacancy_type, reported_at')
        .in('listing_id', facilityIds)
        .gte('reported_at', thirtyDaysAgo.toISOString())

      for (const report of reports || []) {
        if (!vacancySummaries[report.listing_id]) {
          vacancySummaries[report.listing_id] = { has_vacancy: 0, no_vacancy: 0, unknown: 0, latest_report_at: null }
        }
        const summary = vacancySummaries[report.listing_id]
        if (report.vacancy_type === 'has_vacancy') summary.has_vacancy++
        else if (report.vacancy_type === 'no_vacancy') summary.no_vacancy++
        else summary.unknown++

        if (!summary.latest_report_at || report.reported_at > summary.latest_report_at) {
          summary.latest_report_at = report.reported_at
        }
      }
    }

    const facilitiesWithVacancy = (facilities || []).map(f => ({
      ...f,
      vacancy_summary: vacancySummaries[f.id] || { has_vacancy: 0, no_vacancy: 0, unknown: 0, latest_report_at: null },
    }))

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    const response = NextResponse.json({
      facilities: facilitiesWithVacancy,
      total,
      page,
      totalPages,
    })
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Directory API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
