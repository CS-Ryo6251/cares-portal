import { NextRequest, NextResponse } from 'next/server'
import { rankingFilters } from '@/lib/support-ranking'
import { getSupportRanking } from '@/lib/support-ranking-server'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const filters = rankingFilters({
    period: params.get('period') || undefined,
    prefecture: params.get('prefecture') || undefined,
    service_type: params.get('service_type') || undefined,
  })
  if (!filters.prefecture || (params.has('period') && !['week', 'all'].includes(params.get('period')!))
    || (params.get('service_type') || '') !== filters.service) {
    return NextResponse.json({ error: '都道府県・期間・サービスを確認してください' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }
  // Use the same per-prefecture aggregation as the full ranking, never the national top 50.
  const ranking = await getSupportRanking(filters)
  if (!ranking) return NextResponse.json({ error: 'ランキングを読み込めませんでした' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json({ ...ranking, prefecture: filters.prefecture, items: ranking.items.slice(0, 3) }, {
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60' },
  })
}
