import { getSupabaseServiceClient } from '@/lib/supabase'
import { INTAKE_STATUSES, validId } from '@/lib/intake'
import { getIntakeTarget, IntakeError, intakeFailure, intakeJson, intakeResponse, requireIntakeOwner, requireIntakeUser, sameOrigin } from '@/lib/intake-server'

export async function GET(request: Request) {
  try {
    const userId = await requireIntakeUser(); const db = getSupabaseServiceClient()
    const owned = await db.rpc('cares_intake_owned_listings', { p_user: userId })
    if (owned.error) throw new Error('listings lookup failed')
    const listings = owned.data || []
    const query = new URL(request.url).searchParams
    const listingId = query.get('listing') || listings[0]?.id
    if (!listingId) return intakeResponse({ listings: [], target: null, applications: [], total: 0 })
    await requireIntakeOwner(listingId, userId)
    const page = Math.floor(Math.max(0, Math.min(10000, Number(query.get('page')) || 0)))
    const target = await getIntakeTarget(listingId)
    const applications = await db.from('cares_applications').select('id,fields,status,created_at,version', { count: 'exact' }).eq('listing_id', listingId).order('created_at', { ascending: false }).range(page * 25, page * 25 + 24)
    if (applications.error) throw new Error('inbox unavailable')
    // The inbox list needs only names, request type and date, not the rest of the health details.
    return intakeResponse({ listings, target, total: applications.count, applications: (applications.data || []).map(row => ({ id: row.id, status: row.status, created_at: row.created_at, request_type: row.fields.request_type, client_name: row.fields.client_name })) })
  } catch (e) { return intakeFailure(e) }
}

export async function PATCH(request: Request) {
  try {
    sameOrigin(request)
    const userId = await requireIntakeUser(); const body = await intakeJson(request)
    const db = getSupabaseServiceClient()
    if (body.action === 'settings') {
      if (typeof body.listingId !== 'string' || typeof body.enabled !== 'boolean' || typeof body.message !== 'string' || body.message.length > 1000 || !['has_vacancy','no_vacancy','unknown'].includes(String(body.status))) throw new IntakeError('空き情報の入力内容を確認してください。')
      await requireIntakeOwner(body.listingId, userId)
      const result = await db.rpc('cares_intake_update_settings', { p_user: userId, p_listing: body.listingId, p_enabled: body.enabled, p_message: body.message.trim(), p_status: body.status })
      if (result.error) throw new Error('settings update failed')
      return intakeResponse({ success: true })
    }
    if (body.action === 'status') {
      if (typeof body.id !== 'string' || !validId(body.id) || typeof body.status !== 'string' || !Object.hasOwn(INTAKE_STATUSES, body.status) || !Number.isInteger(body.version)) throw new IntakeError('受付状況を選び直してください。')
      const current = await db.from('cares_applications').select('listing_id').eq('id', body.id).maybeSingle()
      if (current.error) throw new Error('application lookup failed')
      if (!current.data) throw new IntakeError('申込みが見つかりません。', 404)
      await requireIntakeOwner(current.data.listing_id, userId)
      const result = await db.from('cares_applications').update({ status: body.status, version: Number(body.version) + 1, updated_at: new Date().toISOString() }).eq('id', body.id).eq('version', body.version).select('version').maybeSingle()
      if (result.error) throw new Error('status update failed')
      if (!result.data) throw new IntakeError('別の担当者が更新しました。再読み込みしてご確認ください。', 409)
      return intakeResponse(result.data)
    }
    throw new IntakeError('操作を確認してください。')
  } catch (e) { return intakeFailure(e) }
}
