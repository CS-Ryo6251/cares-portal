import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase-server-auth'

export async function GET() {
  try {
    const supabase = await createAuthServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 通知一覧を取得（最新50件）
    const { data: notifications, error } = await supabase
      .from('cares_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('通知取得エラー:', error)
      return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
    }

    // 未読数を取得
    const { count } = await supabase
      .from('cares_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    return NextResponse.json({
      notifications: notifications || [],
      unread_count: count || 0,
    })
  } catch (error) {
    console.error('通知APIエラー:', error)
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
    const { notification_ids, mark_all_read } = body

    const now = new Date().toISOString()

    if (mark_all_read) {
      // 全未読通知を既読にする
      const { error } = await supabase
        .from('cares_notifications')
        .update({ is_read: true, read_at: now })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) {
        console.error('全既読更新エラー:', error)
        return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
      }
    } else if (notification_ids && Array.isArray(notification_ids) && notification_ids.length > 0) {
      // 指定した通知を既読にする（本人の通知のみ）
      const { error } = await supabase
        .from('cares_notifications')
        .update({ is_read: true, read_at: now })
        .eq('user_id', user.id)
        .in('id', notification_ids)

      if (error) {
        console.error('既読更新エラー:', error)
        return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: 'notification_ids または mark_all_read が必要です' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('通知APIエラー:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
