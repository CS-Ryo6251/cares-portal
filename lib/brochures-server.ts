import 'server-only'
import { PDFDocument, PDFDict, PDFArray, PDFStream, PDFName } from 'pdf-lib'
import { getSupabaseServiceClient } from './supabase'
import { createAuthServerClient } from './supabase-server-auth'
import { detectFileType, validId } from './intake'
import { IntakeError } from './intake-server'
import type { BrochureList } from './brochures'

export const BROCHURE_BUCKET = 'cares-brochures'
export async function brochureUser(required = false) {
  const auth = await createAuthServerClient()
  const { data: { user }, error } = await auth.auth.getUser()
  if (error && error.name !== 'AuthSessionMissingError') throw new IntakeError('ログイン状態を確認できません。再度ログインしてください。', 401)
  if (required && !user) throw new IntakeError('ログインして資料を共有・保存してください。', 401)
  return user?.id || null
}
export async function brochureListing(id: string) {
  if (!validId(id)) throw new IntakeError('事業所が見つかりません。', 404)
  const db = getSupabaseServiceClient()
  const row = await db.from('cares_listings').select('id,owner_facility_id,is_owner_verified').eq('id', id).maybeSingle()
  if (row.error) throw new Error('listing unavailable')
  if (!row.data) throw new IntakeError('事業所が見つかりません。', 404)
  if (row.data.is_owner_verified && row.data.owner_facility_id) {
    const canonical = await db.from('cares_listings').select('id').eq('owner_facility_id', row.data.owner_facility_id).eq('is_owner_verified', true).order('id').limit(1).single()
    if (canonical.error) throw new Error('listing unavailable')
    return canonical.data.id as string
  }
  return id
}
export async function brochureList(options: { listing?: string; user?: string | null; mode?: string; id?: string; offset?: number }) {
  const { data, error } = await getSupabaseServiceClient().rpc('cares_brochure_list', {
    p_listing: options.listing || null, p_user: options.user || null, p_mode: options.mode || 'public', p_id: options.id || null, p_offset: options.offset || 0,
  })
  if (error || !data) throw new Error('brochures unavailable')
  return data as BrochureList
}
export async function validateBrochureFile(bytes: Uint8Array) {
  const mime = detectFileType(bytes)
  if (!mime) throw new IntakeError('PDF・JPEG・PNG・WebPのファイルを選んでください。')
  if (mime === 'application/pdf') {
    try {
      const pdf = await PDFDocument.load(bytes, { updateMetadata: false })
      if (pdf.getPageCount() < 1 || pdf.getPageCount() > 100) throw new Error('pages')
      // Reject active content and attachments; never embed arbitrary PDF HTML in our origin.
      const blocked = ['JS', 'JavaScript', 'OpenAction', 'AA', 'EmbeddedFiles', 'RichMedia', 'Launch', 'SubmitForm', 'ImportData', 'XFA']
      const visited = new WeakSet<object>(); let count = 0
      function inspect(object: unknown, depth = 0) {
        if (!object || typeof object !== 'object' || visited.has(object)) return
        if (depth > 100 || ++count > 50000) throw new Error('complex document')
        visited.add(object)
        if (object instanceof PDFDict) {
          if (object.keys().some(key => blocked.includes(key.decodeText())) || blocked.includes(String(object.get(PDFName.of('S')) || '').replace(/^\//, ''))) throw new Error('active content')
          object.values().forEach(value => inspect(value, depth + 1))
        } else if (object instanceof PDFArray) object.asArray().forEach(value => inspect(value, depth + 1))
        else if (object instanceof PDFStream) inspect(object.dict, depth + 1)
      }
      for (const [, object] of pdf.context.enumerateIndirectObjects()) inspect(object)
    } catch { throw new IntakeError('このPDFは共有できません。通常のPDFとして書き出すか、写真を選んでください（100ページまで）。') }
  }
  return mime
}
