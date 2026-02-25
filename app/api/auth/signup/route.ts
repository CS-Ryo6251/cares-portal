import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName, profession } = await request.json()

    if (!email || !password || !displayName || !profession) {
      return NextResponse.json({ error: '必須項目を入力してください' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'パスワードは8文字以上で入力してください' }, { status: 400 })
    }

    const validProfessions = ['care_manager', 'msw', 'care_worker', 'nurse', 'therapist', 'family', 'other']
    if (!validProfessions.includes(profession)) {
      return NextResponse.json({ error: '無効な職種が選択されています' }, { status: 400 })
    }

    // Supabase Auth でユーザー作成
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cares.carespace.jp'

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        data: {
          display_name: displayName,
          profession,
          source: 'cares_portal',
        },
      },
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        return NextResponse.json({ error: 'このメールアドレスは既に登録されています' }, { status: 400 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'ユーザー作成に失敗しました' }, { status: 500 })
    }

    // cares_user_profiles にプロフィール作成（service role で RLS バイパス）
    const serviceClient = getSupabaseServiceClient()
    const { error: profileError } = await serviceClient
      .from('cares_user_profiles')
      .insert({
        user_id: authData.user.id,
        display_name: displayName,
        profession,
      })

    if (profileError) {
      console.error('プロフィール作成エラー:', profileError)
      // Auth ユーザーは作成済みなので、プロフィールは後から作成可能
    }

    // メール確認が必要かどうか
    const needsEmailConfirmation = !authData.session

    return NextResponse.json({
      success: true,
      needsEmailConfirmation,
      user: { id: authData.user.id, email: authData.user.email },
    })
  } catch (error) {
    console.error('サインアップエラー:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
