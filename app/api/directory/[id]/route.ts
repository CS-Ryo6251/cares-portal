import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: '事業所IDは必須です' }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    const { data: facility, error } = await supabase
      .from('cares_listings')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !facility) {
      return NextResponse.json({ error: '事業所が見つかりません' }, { status: 404 })
    }

    // Fetch recent vacancy reports (last 10)
    const { data: vacancy_reports } = await supabase
      .from('cares_vacancy_reports')
      .select('*')
      .eq('listing_id', id)
      .order('reported_at', { ascending: false })
      .limit(10)

    // Count approved edits
    const { count: edit_count } = await supabase
      .from('cares_listing_edits')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', id)
      .eq('status', 'approved')

    const response = NextResponse.json({
      facility,
      vacancy_reports: vacancy_reports || [],
      edit_count: edit_count || 0,
    })
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
    return response
  } catch (error) {
    console.error('Directory detail API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
