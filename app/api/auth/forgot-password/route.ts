import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'メールアドレスを入力してください' }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cares.carespace.jp'

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    })

    if (error) {
      console.error('パスワードリセットメール送信エラー:', error)
      // セキュリティ: ユーザーが存在するかどうかを漏らさない
    }

    // 成功・失敗に関わらず同じレスポンスを返す（セキュリティ）
    return NextResponse.json({
      success: true,
      message: '入力されたメールアドレスにリセット用リンクを送信しました',
    })
  } catch (error) {
    console.error('forgot-password API error:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
