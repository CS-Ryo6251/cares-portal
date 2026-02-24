import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'
import crypto from 'crypto'

const ALLOWED_FIELDS = [
  'facility_name',
  'address',
  'phone',
  'fax',
  'email',
  'website_url',
  'service_type',
  'capacity',
  'corporation_name',
]

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
    const { field_name, old_value, new_value, reason } = body

    if (!field_name || !ALLOWED_FIELDS.includes(field_name)) {
      return NextResponse.json({ error: '編集可能なフィールドではありません' }, { status: 400 })
    }

    if (new_value === undefined || new_value === null || new_value === '') {
      return NextResponse.json({ error: '新しい値は必須です' }, { status: 400 })
    }

    if (reason && reason.length > 500) {
      return NextResponse.json({ error: '理由は500文字以内で入力してください' }, { status: 400 })
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

    // Rate limit: max 5 edit proposals per ip per day
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const { count: dailyEdits } = await supabase
      .from('cares_listing_edits')
      .select('*', { count: 'exact', head: true })
      .eq('reporter_ip_hash', ipHash)
      .gte('created_at', oneDayAgo.toISOString())

    if ((dailyEdits || 0) >= 5) {
      return NextResponse.json({ error: '1日の編集提案の上限に達しました' }, { status: 429 })
    }

    const { error } = await supabase
      .from('cares_listing_edits')
      .insert({
        listing_id: id,
        field_name,
        old_value: old_value || '',
        new_value,
        reason: reason || null,
        reporter_ip_hash: ipHash,
        status: 'pending',
      })

    if (error) {
      console.error('Edit proposal insert error:', error)
      return NextResponse.json({ error: '編集提案の送信に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Edit proposal API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
