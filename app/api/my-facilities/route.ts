import { NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase-server-auth'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { getMyFacilities } from '@/lib/my-facilities'
import { getFacilitySupport } from '@/lib/facility-support'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }

export async function GET(request: Request) {
  try {
    const auth = await createAuthServerClient()
    const { data: { user }, error } = await auth.auth.getUser()
    if (error || !user) return NextResponse.json({ error: '認証が必要です' }, { status: 401, headers })
    const client = getSupabaseServiceClient()
    const facilities = await getMyFacilities(client, user.id)
    // The header only needs the list. Aggregate engagement on the dedicated page.
    if (new URL(request.url).searchParams.get('engagement') === '1') {
      const now = new Date()
      for (const facility of facilities) {
        facility.support = await getFacilitySupport(client, facility.id, now)
      }
    }
    return NextResponse.json({ facilities }, { headers })
  } catch {
    return NextResponse.json({ error: '事業所を読み込めませんでした。時間をおいてお試しください。' }, { status: 503, headers })
  }
}
