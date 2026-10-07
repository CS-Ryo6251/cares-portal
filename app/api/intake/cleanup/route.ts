import { timingSafeEqual } from 'node:crypto'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { INTAKE_BUCKET, intakeResponse } from '@/lib/intake-server'
export const maxDuration = 60
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : ''
  const provided = request.headers.get('authorization') || ''
  if (!expected || expected.length !== provided.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) return intakeResponse({ error: 'Unauthorized' }, 401)
  const db = getSupabaseServiceClient()
  const candidates = await db.rpc('cares_intake_cleanup_candidates')
  if (candidates.error) return intakeResponse({ error: 'Cleanup unavailable' }, 503)
  let removed = 0; let failed = 0
  for (const draft of candidates.data || []) {
    const files = await db.from('cares_intake_files').select('storage_path').eq('draft_id', draft.id)
    if (files.error) { failed++; continue }
    if (files.data.length) {
      const deletion = await db.storage.from(INTAKE_BUCKET).remove(files.data.map(row => row.storage_path))
      if (deletion.error) { failed++; continue }
    }
    const result = await db.rpc('cares_intake_cleanup_finish', { p_draft: draft.id })
    if (result.error) failed++; else removed++
  }
  const limits = await db.from('cares_intake_limits').delete().lt('expires_at', new Date().toISOString())
  if (limits.error) failed++
  return intakeResponse({ removed, failed }, failed ? 503 : 200)
}
