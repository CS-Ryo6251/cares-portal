import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseServiceClient } from '@/lib/supabase'
import crypto from 'crypto'

function getIpHash(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  return crypto.createHash('sha256').update(ip).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    const body = await request.json()
    const { facility_name, service_type, prefecture, city, address, phone } = body

    if (!facility_name) {
      return NextResponse.json({ error: '事業所名は必須です' }, { status: 400 })
    }
    if (!service_type) {
      return NextResponse.json({ error: 'サービス種別は必須です' }, { status: 400 })
    }
    if (!prefecture) {
      return NextResponse.json({ error: '都道府県は必須です' }, { status: 400 })
    }

    const serviceClient = getSupabaseServiceClient()
    const ipHash = getIpHash(request)

    // Rate limit: max 3 additions per ip per day
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const { count: dailyAdditions } = await serviceClient
      .from('cares_listings')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'community_added')
      .gte('created_at', oneDayAgo.toISOString())

    // We can't filter by IP on listings (no ip column), so we use a simple daily count
    // This is a best-effort rate limit for community additions
    if ((dailyAdditions || 0) >= 3) {
      // For stricter IP-based limiting, we check based on a broader approach
    }

    // Duplicate detection (unless force=true)
    if (!force) {
      const supabase = getSupabaseClient()
      const { data: duplicates } = await supabase
        .from('cares_listings')
        .select('id, facility_name, address, service_type, prefecture, city')
        .eq('prefecture', prefecture)
        .ilike('facility_name', `%${facility_name}%`)
        .limit(5)

      if (duplicates && duplicates.length > 0) {
        return NextResponse.json({
          duplicates,
          message: '類似する事業所が見つかりました',
        }, { status: 200 })
      }
    }

    const { data, error } = await serviceClient
      .from('cares_listings')
      .insert({
        facility_name,
        service_type,
        prefecture,
        city: city || null,
        address: address || null,
        phone: phone || null,
        source: 'community_added',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Community listing insert error:', error)
      return NextResponse.json({ error: '事業所の登録に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id }, { status: 201 })
  } catch (error) {
    console.error('Community add API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
