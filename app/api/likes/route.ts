import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase-server-auth'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { post_id } = body

    if (!post_id) {
      return NextResponse.json({ error: 'post_id は必須です' }, { status: 400 })
    }

    // Check if already liked
    const { data: existing } = await supabase
      .from('cares_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', post_id)
      .maybeSingle()

    if (existing) {
      // Unlike: delete existing like
      const { error } = await supabase
        .from('cares_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', post_id)

      if (error) {
        console.error('Like delete error:', error)
        return NextResponse.json({ error: 'いいね取消に失敗しました' }, { status: 500 })
      }

      return NextResponse.json({ liked: false })
    } else {
      // Like: insert new like
      const { error } = await supabase
        .from('cares_likes')
        .insert({ user_id: user.id, post_id })

      if (error) {
        console.error('Like insert error:', error)
        return NextResponse.json({ error: 'いいねに失敗しました' }, { status: 500 })
      }

      return NextResponse.json({ liked: true })
    }
  } catch (error) {
    console.error('Likes API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
