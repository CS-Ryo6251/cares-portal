import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase-server-auth'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { getHeartSummaries } from '@/lib/hearts'
import { UUID_PATTERN } from '@/lib/community'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: '事業所IDが不正です' }, { status: 400 })
  try {
    const summaries = await getHeartSummaries([id])
    if (!summaries) return NextResponse.json({ error: 'ハートを取得できませんでした' }, { status: 503 })
    return NextResponse.json(summaries[id] || { total: '0', supporters: '0' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'ハートを取得できませんでした' }, { status: 503 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: '事業所IDが不正です' }, { status: 400 })
  try {
    const auth = await createAuthServerClient()
    const { data: { user }, error: authError } = await auth.auth.getUser()
    if (authError || !user || user.is_anonymous) return NextResponse.json({ error: 'ログインして応援してください' }, { status: 401 })
    const body = await request.json().catch(() => null)
    if (!body || typeof body.request_id !== 'string' || !UUID_PATTERN.test(body.request_id)) {
      return NextResponse.json({ error: '送信IDが不正です' }, { status: 400 })
    }
    const { data, error } = await getSupabaseServiceClient().rpc('cares_send_listing_heart', {
      p_listing_id: id, p_user_id: user.id, p_request_id: body.request_id,
    })
    if (error) {
      const status = error.message.includes('HEART_TOO_FAST') ? 429 : error.message.includes('LISTING_NOT_FOUND') ? 404 : 503
      return NextResponse.json({ error: status === 429 ? '少し間をあけて、もう一度応援してください' : 'ハートを送信できませんでした。同じ送信を再確認できます' }, { status })
    }
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: '送信結果を確認できませんでした。もう一度お試しください' }, { status: 503 })
  }
}
