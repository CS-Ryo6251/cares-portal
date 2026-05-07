import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { createAuthServerClient } from '@/lib/supabase-server-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      claimer_name,
      claimer_email,
      claimer_phone,
      organization_name,
      jigyosho_number,
      message,
    } = body

    if (!claimer_name?.trim()) {
      return NextResponse.json({ error: 'お名前は必須です' }, { status: 400 })
    }

    if (!claimer_email?.trim()) {
      return NextResponse.json({ error: 'メールアドレスは必須です' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()
    const authSupabase = await createAuthServerClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    const { data: listing } = await supabase
      .from('cares_listings')
      .select('id, jigyosho_number')
      .eq('id', id)
      .single()

    if (!listing) {
      return NextResponse.json({ error: '事業所が見つかりません' }, { status: 404 })
    }

    const { data: existingClaim } = await supabase
      .from('cares_owner_claims')
      .select('id')
      .eq('listing_id', id)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle()

    if (existingClaim) {
      return NextResponse.json({ error: 'この事業所には既に申請中の公式管理依頼があります' }, { status: 409 })
    }

    const { error } = await supabase
      .from('cares_owner_claims')
      .insert({
        listing_id: id,
        user_id: user?.id || null,
        claimer_name: claimer_name.trim(),
        claimer_email: claimer_email.trim(),
        claimer_phone: claimer_phone?.trim() || null,
        organization_name: organization_name?.trim() || null,
        jigyosho_number: jigyosho_number?.trim() || listing.jigyosho_number || null,
        notes: message?.trim() || null,
        status: 'pending',
      })

    if (error) {
      console.error('Owner claim insert error:', error)
      return NextResponse.json({ error: '公式管理の申請に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Owner claim API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
