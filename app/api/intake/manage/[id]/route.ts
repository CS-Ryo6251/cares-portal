import { getSupabaseServiceClient } from '@/lib/supabase'
import { validId } from '@/lib/intake'
import { INTAKE_BUCKET, IntakeError, intakeFailure, intakeResponse, requireIntakeOwner, requireIntakeUser } from '@/lib/intake-server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireIntakeUser(); const { id } = await params
    if (!validId(id)) throw new IntakeError('申込みが見つかりません。', 404)
    const db = getSupabaseServiceClient()
    const result = await db.from('cares_applications').select('*').eq('id', id).maybeSingle()
    if (result.error) throw new Error('application lookup failed')
    if (!result.data) throw new IntakeError('申込みが見つかりません。', 404)
    await requireIntakeOwner(result.data.listing_id, userId)
    const fileId = new URL(request.url).searchParams.get('file')
    const files = await db.from('cares_intake_files').select('id,mime_type,size_bytes,storage_path').eq('draft_id', result.data.draft_id).eq('ready', true).order('created_at')
    if (files.error) throw new Error('attachments lookup failed')
    if (fileId) {
      const file = files.data.find(file => file.id === fileId)
      if (!file) throw new IntakeError('書類が見つかりません。', 404)
      const download = await db.storage.from(INTAKE_BUCKET).download(file.storage_path)
      if (download.error || !download.data) throw new Error('attachment download failed')
      const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' } as Record<string,string>)[file.mime_type]
      return new Response(download.data, { headers: { 'Content-Type': file.mime_type, 'Content-Disposition': `attachment; filename="application-document.${extension}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } })
    }
    return intakeResponse({ application: { id, listing_id: result.data.listing_id, fields: result.data.fields, status: result.data.status, version: result.data.version, created_at: result.data.created_at }, files: files.data.map(({ id, mime_type, size_bytes }) => ({ id, mime_type, size_bytes })) })
  } catch (e) { return intakeFailure(e) }
}
