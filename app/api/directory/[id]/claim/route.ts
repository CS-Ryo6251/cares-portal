import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { claimer_name, claimer_email, claimer_phone, organization_name, jigyosho_number } = body

    if (!claimer_name) {
      return NextResponse.json({ error: 'お名前は必須です' }, { status: 400 })
    }

    if (!claimer_email) {
      return NextResponse.json({ error: 'メールアドレスは必須です' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    // Check listing exists
    const { data: listing } = await supabase
      .from('cares_listings')
      .select('id')
      .eq('id', id)
      .single()

    if (!listing) {
      return NextResponse.json({ error: '事業所が見つかりません' }, { status: 404 })
    }

    // Check for existing pending claim
    const { data: existingClaim } = await supabase
      .from('cares_owner_claims')
      .select('id')
      .eq('listing_id', id)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle()

    if (existingClaim) {
      return NextResponse.json({ error: 'この事業所には既に申請中のオーナー登録があります' }, { status: 409 })
    }

    const { error } = await supabase
      .from('cares_owner_claims')
      .insert({
        listing_id: id,
        claimer_name,
        claimer_email,
        claimer_phone: claimer_phone || null,
        organization_name: organization_name || null,
        jigyosho_number: jigyosho_number || null,
        status: 'pending',
      })

    if (error) {
      console.error('Owner claim insert error:', error)
      return NextResponse.json({ error: 'オーナー登録の申請に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Owner claim API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
