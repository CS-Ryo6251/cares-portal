import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase-server-auth'
import { SUPPORT_PERIODS, type SupportPeriod } from '@/lib/my-support'

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' }
export async function GET(request: NextRequest) {
  try {
    const client = await createAuthServerClient()
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'ログインして応援の記録を確認してください' }, { status: 401, headers })
    const period = request.nextUrl.searchParams.get('period') || '30d'
    if (!SUPPORT_PERIODS.includes(period as SupportPeriod)) return NextResponse.json({ error: '期間が正しくありません' }, { status: 400, headers })
    // The authenticated client + RPC's auth.uid() + table RLS all scope to self.
    const { data, error } = await client.rpc('cares_my_support', { p_period: period })
    if (error || !data) throw new Error('History unavailable')
    return NextResponse.json(data, { headers })
  } catch {
    return NextResponse.json({ error: '応援の記録を読み込めませんでした。時間をおいて、もう一度お試しください' }, { status: 503, headers })
  }
}
