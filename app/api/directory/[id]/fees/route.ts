import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseServiceClient } from '@/lib/supabase'
import crypto from 'crypto'

function getIpHash(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  return crypto.createHash('sha256').update(ip).digest('hex')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('cares_listing_fees')
      .select('id, fee_type, amount_min, amount_max, description, source, created_at')
      .eq('listing_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ fees: data || [] })
  } catch {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { fee_type, amount_min, amount_max, description } = body

    if (!fee_type || typeof fee_type !== 'string' || fee_type.trim().length === 0) {
      return NextResponse.json({ error: '料金種別を入力してください' }, { status: 400 })
    }

    if (fee_type.length > 50) {
      return NextResponse.json({ error: '料金種別は50文字以内で入力してください' }, { status: 400 })
    }

    if (amount_min == null && amount_max == null && !description) {
      return NextResponse.json({ error: '金額または説明を入力してください' }, { status: 400 })
    }

    if (description && description.length > 200) {
      return NextResponse.json({ error: '説明は200文字以内で入力してください' }, { status: 400 })
    }

    if (amount_min != null && (isNaN(amount_min) || amount_min < 0)) {
      return NextResponse.json({ error: '金額が不正です' }, { status: 400 })
    }

    if (amount_max != null && (isNaN(amount_max) || amount_max < 0)) {
      return NextResponse.json({ error: '金額が不正です' }, { status: 400 })
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

    // Rate limit: max 10 fee entries per ip per day
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const { count } = await supabase
      .from('cares_listing_fees')
      .select('*', { count: 'exact', head: true })
      .eq('reporter_ip_hash', ipHash)
      .gte('created_at', oneDayAgo.toISOString())

    if ((count || 0) >= 10) {
      return NextResponse.json({ error: '1日の投稿上限に達しました' }, { status: 429 })
    }

    const { error } = await supabase
      .from('cares_listing_fees')
      .insert({
        listing_id: id,
        fee_type: fee_type.trim(),
        amount_min: amount_min != null ? Math.round(amount_min) : null,
        amount_max: amount_max != null ? Math.round(amount_max) : null,
        description: description?.trim() || null,
        source: 'community',
        reporter_ip_hash: ipHash,
      })

    if (error) {
      console.error('Fee insert error:', error)
      return NextResponse.json({ error: '投稿に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Fees API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
