import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase-server-auth'
import { getSupabaseServiceClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await createAuthServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('cares_user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('プロフィール取得エラー:', error)
      return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      profile: profile ?? null,
      email: user.email,
    })
  } catch (error) {
    console.error('アカウントAPIエラー:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createAuthServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const allowedFields = [
      'display_name',
      'profession',
      'notify_vacancy_change',
      'notify_comment_reply',
      'email_notifications',
    ]

    // 許可されたフィールドのみ抽出
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '更新するフィールドがありません' }, { status: 400 })
    }

    const serviceClient = getSupabaseServiceClient()

    // 既存プロフィールの有無をチェック
    const { data: existing } = await serviceClient
      .from('cares_user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    // 新規作成時は display_name と profession が必須
    if (!existing) {
      if (!updates.display_name || !(updates.display_name as string).trim()) {
        return NextResponse.json({ error: '表示名を入力してください' }, { status: 400 })
      }
      if (!updates.profession) {
        return NextResponse.json({ error: '職種を選択してください' }, { status: 400 })
      }
    }

    updates.updated_at = new Date().toISOString()
    updates.user_id = user.id

    const { data: profile, error } = await serviceClient
      .from('cares_user_profiles')
      .upsert(updates, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) {
      console.error('プロフィール更新エラー:', error)
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    console.error('アカウントAPIエラー:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createAuthServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // プロフィール削除
    const { error: deleteError } = await supabase
      .from('cares_user_profiles')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('プロフィール削除エラー:', deleteError)
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
    }

    // auth.usersからも削除（GDPR対応）
    const serviceClient = getSupabaseServiceClient()
    const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(user.id)

    if (authDeleteError) {
      console.error('auth.users削除エラー:', authDeleteError)
      // プロフィールは既に削除済み。auth側の失敗はログのみ
    }

    // サインアウト
    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('アカウント削除APIエラー:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
