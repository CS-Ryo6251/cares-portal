import { NextRequest, NextResponse } from 'next/server'
import { heartVisitor, setHeartVisitor } from '@/lib/heart-visitor'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { getHeartSummaries } from '@/lib/hearts'
import { UUID_PATTERN } from '@/lib/community'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: '事業所IDが不正です' }, { status: 400 })
  try {
    const summaries = await getHeartSummaries([id])
    if (!summaries) return NextResponse.json({ error: 'ハートを取得できませんでした' }, { status: 503 })
    return setHeartVisitor(NextResponse.json(summaries[id] || { total: '0' }, { headers: { 'Cache-Control': 'no-store' } }), heartVisitor(request))
  } catch {
    return NextResponse.json({ error: 'ハートを取得できませんでした' }, { status: 503 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: '事業所IDが不正です' }, { status: 400 })
  try {
    if (request.headers.get('origin') !== request.nextUrl.origin) {
      return NextResponse.json({ error: 'Caresの画面から応援してください' }, { status: 403 })
    }
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
      return NextResponse.json({ error: '送信形式が不正です' }, { status: 415 })
    }
    const body = await request.json().catch(() => null)
    if (!body || typeof body.request_id !== 'string' || !UUID_PATTERN.test(body.request_id)) {
      return NextResponse.json({ error: '送信IDが不正です' }, { status: 400 })
    }
    const visitor = heartVisitor(request)
    const { data, error } = await getSupabaseServiceClient().rpc('cares_send_guest_heart', {
      p_listing_id: id, p_request_id: body.request_id,
      p_visitor_hash: visitor.visitorHash, p_network_hash: visitor.networkHash,
    })
    if (error) {
      const status = error.message.includes('HEART_TOO_FAST') ? 429 : error.message.includes('LISTING_NOT_FOUND') ? 404 : error.message.includes('REQUEST_CONFLICT') ? 400 : 503
      return setHeartVisitor(NextResponse.json({ error: status === 429 ? '少し間をあけて、もう一度応援してください' : 'ハートを送信できませんでした。同じ送信を再確認できます' }, { status, headers: { 'Cache-Control': 'no-store', ...(status === 429 ? { 'Retry-After': '1' } : {}) } }), visitor)
    }
    return setHeartVisitor(NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } }), visitor)
  } catch {
    return NextResponse.json({ error: '送信結果を確認できませんでした。もう一度お試しください' }, { status: 503 })
  }
}
