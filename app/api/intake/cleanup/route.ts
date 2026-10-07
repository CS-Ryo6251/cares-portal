import { timingSafeEqual } from 'node:crypto'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { INTAKE_BUCKET, intakeResponse } from '@/lib/intake-server'
export const maxDuration = 60
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : ''
  const provided = request.headers.get('authorization') || ''
  if (!expected || expected.length !== provided.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) return intakeResponse({ error: 'Unauthorized' }, 401)
  const db = getSupabaseServiceClient()
  let removed = 0; let failed = 0; let pending = false
  const deadline = Date.now() + 45000
  for (let batch = 0; batch < 20 && Date.now() < deadline; batch++) {
    const candidates = await db.rpc('cares_intake_cleanup_candidates')
    if (candidates.error) { failed++; break }
    const ids = (candidates.data || []).map((draft: { id: string }) => draft.id)
    if (!ids.length) { pending = false; break }
    pending = true
    const files = await db.from('cares_intake_files').select('storage_path').in('draft_id', ids)
    if (files.error) { failed++; break }
    if (files.data.length) {
      const deletion = await db.storage.from(INTAKE_BUCKET).remove(files.data.map(row => row.storage_path))
      if (deletion.error) { failed++; break }
    }
    const result = await db.rpc('cares_intake_cleanup_finish_batch', { p_drafts: ids })
    if (result.error) { failed++; break }
    removed += Number(result.data)
    if (ids.length < 100) { pending = false; break }
  }
  const limits = await db.from('cares_intake_limits').delete().lt('expires_at', new Date().toISOString())
  if (limits.error) failed++
  return intakeResponse({ removed, failed, pending }, failed || pending ? 503 : 200)
}
