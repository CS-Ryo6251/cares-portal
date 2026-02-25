import { createBrowserClient } from '@supabase/ssr'

// ブラウザ側：Cookie-based auth クライアント（'use client' コンポーネント用）
export function createAuthClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
