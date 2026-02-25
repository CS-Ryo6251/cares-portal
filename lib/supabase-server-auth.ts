import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// サーバー側：Cookie-based auth クライアント（Server Components / Route Handlers用）
export async function createAuthServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components では cookie.set が呼べないケースがある
          }
        },
      },
    }
  )
}

// 現在のユーザーを取得（Server Components / Route Handlers用）
export async function getCurrentUser() {
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('cares_user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return { user, profile }
}
