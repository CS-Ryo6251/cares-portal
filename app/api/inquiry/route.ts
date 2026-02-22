import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { facility_id, inquirer_name, inquirer_phone, inquirer_email, inquirer_type, message } = body

    // バリデーション
    if (!facility_id) {
      return NextResponse.json({ error: '施設IDは必須です' }, { status: 400 })
    }
    if (!inquirer_name) {
      return NextResponse.json({ error: 'お名前は必須です' }, { status: 400 })
    }
    if (!inquirer_type) {
      return NextResponse.json({ error: '問い合わせ種別は必須です' }, { status: 400 })
    }
    if (!message) {
      return NextResponse.json({ error: 'メッセージは必須です' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    const { data, error } = await supabase
      .from('facility_portal_inquiries')
      .insert({
        facility_id,
        inquirer_name,
        inquirer_phone: inquirer_phone || null,
        inquirer_email: inquirer_email || null,
        inquirer_type,
        message,
        status: 'new',
      })
      .select('id')
      .single()

    if (error) {
      console.error('問い合わせ送信エラー:', error)
      return NextResponse.json({ error: '送信に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id }, { status: 201 })
  } catch (error) {
    console.error('問い合わせAPIエラー:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
