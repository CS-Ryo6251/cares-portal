import { NextResponse } from 'next/server'
import { BROCHURE_BUCKET } from '@/lib/brochures-server'
import { validId } from '@/lib/intake'
import { IntakeError, intakeFailure } from '@/lib/intake-server'
import { getSupabaseServiceClient } from '@/lib/supabase'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params, index = Number(new URL(request.url).searchParams.get('index') || 0)
    if (!validId(id) || !Number.isInteger(index) || index < 0 || index > 2) throw new IntakeError('資料が見つかりません。', 404)
    const db = getSupabaseServiceClient()
    const row = await db.from('cares_brochures').select('files').eq('id', id).eq('status', 'published').maybeSingle()
    if (row.error) throw new Error('file unavailable')
    const file = row.data?.files?.[index] as { path: string; mime: string } | undefined
    if (!file) throw new IntakeError('この資料は公開されていません。', 404)
    const signed = await db.storage.from(BROCHURE_BUCKET).createSignedUrl(file.path, 60, file.mime === 'application/pdf' ? { download: 'pamphlet.pdf' } : undefined)
    if (signed.error || !signed.data) throw new Error('file unavailable')
    return NextResponse.redirect(signed.data.signedUrl, { status: 302, headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' } })
  } catch (error) { return intakeFailure(error) }
}
