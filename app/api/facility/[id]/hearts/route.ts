import { NextRequest, NextResponse } from 'next/server'
import { UUID_PATTERN } from '@/lib/community'
import { getSupabaseClient } from '@/lib/supabase'
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const headers = { 'Cache-Control': 'no-store' }
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: '事業所IDが不正です' }, { status: 400, headers })
  const { data, error } = await getSupabaseClient().from('cares_facility_support_summary').select('total,direct_total,post_total').eq('facility_id', id).maybeSingle()
  if (error) return NextResponse.json({ error: '応援を取得できませんでした' }, { status: 503, headers })
  if (!data) return NextResponse.json({ error: '公開中の事業所が見つかりません' }, { status: 404, headers })
  return NextResponse.json(data, { headers })
}
