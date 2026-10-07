import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { createAuthServerClient } from '@/lib/supabase-server-auth'
import { UUID_PATTERN, validateVacancy } from '@/lib/community'
import crypto from 'crypto'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: '事業所IDが不正です' }, { status: 400 })
    const auth = await createAuthServerClient()
    const { data: { user }, error: authError } = await auth.auth.getUser()
    if (authError || !user || user.is_anonymous) return NextResponse.json({ error: 'ログインして空き情報を掲載してください' }, { status: 401 })
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 })
    const validation = validateVacancy(body)
    if (validation) return NextResponse.json({ error: validation }, { status: 400 })
    const supabase = getSupabaseServiceClient()
    const { data: listing, error: listingError } = await supabase.from('cares_listings').select('id').eq('id', id).maybeSingle()
    if (listingError) return NextResponse.json({ error: '事業所を確認できませんでした' }, { status: 503 })
    if (!listing) return NextResponse.json({ error: '事業所が見つかりません' }, { status: 404 })
    // Allow same-day corrections; an operational rate limit is separate from publication freshness.
    const { count, error: limitError } = await supabase.from('cares_vacancy_reports')
      .select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      .gte('reported_at', new Date(Date.now() - 60000).toISOString())
    if (limitError) return NextResponse.json({ error: '投稿状況を確認できませんでした' }, { status: 503 })
    if ((count || 0) >= 5) return NextResponse.json({ error: '少し間をあけて投稿してください' }, { status: 429 })
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const { error } = await supabase.from('cares_vacancy_reports').insert({
      listing_id: id, user_id: user.id, reporter_ip_hash: crypto.createHash('sha256').update(ip).digest('hex'),
      vacancy_type: body.vacancy_type, information_source: body.information_source,
      confirmed_on: body.confirmed_on, valid_until: body.valid_until, comment: body.comment?.trim() || null,
      is_verified: false,
    })
    if (error) return NextResponse.json({ error: '掲載に失敗しました' }, { status: 503 })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch { return NextResponse.json({ error: '送信結果を確認できませんでした。画面を更新して掲載内容をご確認ください' }, { status: 503 }) }
}
