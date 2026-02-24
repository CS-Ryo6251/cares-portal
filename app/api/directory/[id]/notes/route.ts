import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseServiceClient } from '@/lib/supabase'
import crypto from 'crypto'

function getIpHash(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  return crypto.createHash('sha256').update(ip).digest('hex')
}

const ALLOWED_TYPES = ['care_manager', 'msw', 'nurse', 'therapist', 'counselor', 'doctor', 'other']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('cares_professional_notes')
      .select('id, reporter_type, content, created_at')
      .eq('listing_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ notes: data || [] })
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
    const { reporter_type, content } = body

    if (!reporter_type || !ALLOWED_TYPES.includes(reporter_type)) {
      return NextResponse.json({ error: '職種を選択してください' }, { status: 400 })
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'メモ内容を入力してください' }, { status: 400 })
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'メモは500文字以内で入力してください' }, { status: 400 })
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

    // Rate limit: max 5 notes per ip per day
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const { count } = await supabase
      .from('cares_professional_notes')
      .select('*', { count: 'exact', head: true })
      .eq('reporter_ip_hash', ipHash)
      .gte('created_at', oneDayAgo.toISOString())

    if ((count || 0) >= 5) {
      return NextResponse.json({ error: '1日の投稿上限に達しました' }, { status: 429 })
    }

    const { error } = await supabase
      .from('cares_professional_notes')
      .insert({
        listing_id: id,
        reporter_type,
        content: content.trim(),
        reporter_ip_hash: ipHash,
      })

    if (error) {
      console.error('Note insert error:', error)
      return NextResponse.json({ error: '投稿に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Notes API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
