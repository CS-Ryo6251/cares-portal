import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeAuthRedirect } from '@/lib/auth-redirect'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // セッションをリフレッシュ + ユーザー取得（1回のみ）
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const protectedPaths = ['/account', '/favorites', '/my-actions', '/notifications', '/my-facilities', '/manage']

  function redirectWithSession(url: URL) {
    const response = NextResponse.redirect(url)
    // A refresh may have replaced the cookie; redirects must retain it too.
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie))
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  }

  // 認証必須ページへの未ログインアクセスをリダイレクト
  if (!user && protectedPaths.some(p => path.startsWith(p))) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', path + request.nextUrl.search)
    return redirectWithSession(loginUrl)
  }

  // ログイン済みなら指定されたサイト内の画面へ移動
  if (user && (path === '/login' || path === '/signup')) {
    return redirectWithSession(new URL(safeAuthRedirect(request.nextUrl.searchParams.get('redirect')), request.url))
  }

  if (supabaseResponse.cookies.getAll().length > 0) {
    supabaseResponse.headers.set('Cache-Control', 'private, no-store')
  }
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.png|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
