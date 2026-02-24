import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'
import crypto from 'crypto'

function getIpHash(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  return crypto.createHash('sha256').update(ip).digest('hex')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { vacancy_type, comment } = body

    if (!vacancy_type || !['has_vacancy', 'no_vacancy', 'unknown'].includes(vacancy_type)) {
      return NextResponse.json({ error: '空き状況の種別が不正です' }, { status: 400 })
    }

    if (comment && comment.length > 200) {
      return NextResponse.json({ error: 'コメントは200文字以内で入力してください' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()
    const ipHash = getIpHash(request)

    // Check listing exists
    const { data: listing } = await supabase
      .from('cares_listings')
      .select('id')
      .eq('id', id)
      .single()

    if (!listing) {
      return NextResponse.json({ error: '事業所が見つかりません' }, { status: 404 })
    }

    // Rate limit: same ip + listing in last 24h
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const { count: recentForListing } = await supabase
      .from('cares_vacancy_reports')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', id)
      .eq('reporter_ip_hash', ipHash)
      .gte('reported_at', oneDayAgo.toISOString())

    if ((recentForListing || 0) > 0) {
      return NextResponse.json({ error: '24時間以内に既にレポート済みです' }, { status: 429 })
    }

    // Rate limit: max 10 reports per ip per day
    const { count: dailyTotal } = await supabase
      .from('cares_vacancy_reports')
      .select('*', { count: 'exact', head: true })
      .eq('reporter_ip_hash', ipHash)
      .gte('reported_at', oneDayAgo.toISOString())

    if ((dailyTotal || 0) >= 10) {
      return NextResponse.json({ error: '1日の投稿上限に達しました' }, { status: 429 })
    }

    const { error } = await supabase
      .from('cares_vacancy_reports')
      .insert({
        listing_id: id,
        reporter_ip_hash: ipHash,
        vacancy_type,
        comment: comment || null,
      })

    if (error) {
      console.error('Vacancy report insert error:', error)
      return NextResponse.json({ error: 'レポートの投稿に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Vacancy report API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
