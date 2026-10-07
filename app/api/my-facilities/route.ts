import { NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase-server-auth'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { getMyFacilities } from '@/lib/my-facilities'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }

export async function GET() {
  try {
    const auth = await createAuthServerClient()
    const { data: { user }, error } = await auth.auth.getUser()
    if (error || !user) return NextResponse.json({ error: '認証が必要です' }, { status: 401, headers })
    const facilities = await getMyFacilities(getSupabaseServiceClient(), user.id)
    return NextResponse.json({ facilities }, { headers })
  } catch {
    return NextResponse.json({ error: '事業所を読み込めませんでした。時間をおいてお試しください。' }, { status: 503, headers })
  }
}
