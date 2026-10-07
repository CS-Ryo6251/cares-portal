import 'server-only'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSupabaseServiceClient } from './supabase'
import { getCurrentUser } from './supabase-server-auth'
import { validId } from './intake'

export const INTAKE_BUCKET = 'cares-applications'
export class IntakeError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}
export function intakeResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } })
}
export function intakeFailure(error: unknown) {
  // Do not log request bodies, extracted information, original filenames, or provider errors.
  return intakeResponse({ error: error instanceof IntakeError ? error.message : '処理を完了できませんでした。時間をおいて再度お試しください。' }, error instanceof IntakeError ? error.status : 503)
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new IntakeError('このページを開き直してお試しください。', 403)
}
export async function limitedBody(request: Request, maximum = 24000) {
  if (Number(request.headers.get('content-length') || 0) > maximum) throw new IntakeError('データが大きすぎます。', 413)
  const reader = request.body?.getReader()
  if (!reader) throw new IntakeError('入力内容を確認してください。')
  const chunks: Uint8Array[] = []; let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maximum) { await reader.cancel(); throw new IntakeError('データが大きすぎます。', 413) }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}
export async function intakeJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const data = JSON.parse((await limitedBody(request)).toString('utf8'))
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error()
    return data
  } catch (e) { if (e instanceof IntakeError) throw e; throw new IntakeError('入力内容を確認してください。') }
}
export function secretHash(value: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('missing server configuration')
  return createHmac('sha256', secret).update(`cares-intake:${value}`).digest('hex')
}
export async function takeLimit(key: string, limit: number, seconds: number) {
  const { data, error } = await getSupabaseServiceClient().rpc('cares_intake_take_limit', { p_key: key, p_limit: limit, p_seconds: seconds })
  if (error) throw new Error('limit unavailable')
  if (data !== true) throw new IntakeError('短時間の利用回数が上限に達しました。時間をおいてお試しください。', 429)
}
export function networkKey(request: Request) {
  const ip = (request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim()
  return secretHash(`network:${ip}`)
}
export async function getIntakeTarget(id: string) {
  if (!validId(id)) return null
  const db = getSupabaseServiceClient()
  const [listing, recipients, settings] = await Promise.all([
    db.from('cares_listings').select('id,facility_name,service_type,phone,owner_facility_id,is_owner_verified,acceptance_status').eq('id', id).maybeSingle(),
    db.rpc('cares_intake_recipients', { p_listing: id }),
    db.from('cares_intake_settings').select('enabled,vacancy_message,updated_at').eq('listing_id', id).maybeSingle(),
  ])
  if (listing.error || recipients.error || settings.error) throw new Error('target lookup failed')
  if (!listing.data?.is_owner_verified || !recipients.data?.length) return null
  let status = listing.data.acceptance_status || 'unknown'
  if (listing.data.owner_facility_id) {
    const { data, error } = await db.from('facility_portal_profiles').select('acceptance_status').eq('facility_id', listing.data.owner_facility_id).eq('is_published', true).maybeSingle()
    if (error) throw new Error('vacancy lookup failed')
    if (data?.acceptance_status) status = data.acceptance_status
  }
  return { id, name: listing.data.facility_name as string, serviceType: listing.data.service_type as string | null, phone: listing.data.phone as string | null,
    status: status as string, enabled: settings.data?.enabled !== false, message: (settings.data?.vacancy_message || '') as string, messageUpdatedAt: settings.data?.updated_at as string | undefined }
}
export type IntakeTarget = NonNullable<Awaited<ReturnType<typeof getIntakeTarget>>>
export async function requireTarget(id: string) {
  const target = await getIntakeTarget(id)
  if (!target || !target.enabled) throw new IntakeError('現在、この事業所ではフォームでの受付を行っていません。直接お問い合わせください。', 409)
  return target
}
export async function createDraft(listingId: string) {
  const secret = randomBytes(32).toString('hex')
  const { data, error } = await getSupabaseServiceClient().from('cares_intake_drafts').insert({ listing_id: listingId, secret_hash: secretHash(secret) }).select('id').single()
  if (error || !data) throw new Error('draft creation failed')
  const cookieStore = await cookies()
  cookieStore.set(`cares-intake-${listingId}`, `${data.id}.${secret}`, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: `/api/intake/${listingId}`, maxAge: 86400 })
  return data.id as string
}
export async function getDraft(listingId: string, allowSubmitted = false) {
  const value = (await cookies()).get(`cares-intake-${listingId}`)?.value || ''
  const [id, secret] = value.split('.')
  if (!validId(id || '') || !/^[0-9a-f]{64}$/.test(secret || '')) throw new IntakeError('入力セッションが切れました。ページを開き直してください。', 401)
  const db = getSupabaseServiceClient()
  const { data, error } = await db.from('cares_intake_drafts').select('*').eq('id', id).eq('listing_id', listingId).maybeSingle()
  if (error) throw new Error('draft lookup failed')
  const hash = secretHash(secret)
  if (!data || typeof data.secret_hash !== 'string' || data.secret_hash.length !== hash.length || !timingSafeEqual(Buffer.from(hash), Buffer.from(data.secret_hash)) || new Date(data.expires_at).getTime() <= Date.now()) throw new IntakeError('入力セッションが切れました。ページを開き直してください。', 401)
  if (!allowSubmitted) {
    const sent = await db.from('cares_applications').select('id').eq('draft_id', id).maybeSingle()
    if (sent.error) throw new Error('submission lookup failed')
    if (sent.data) throw new IntakeError('この申込みは送信済みです。', 409)
  }
  return { id, hash }
}
export async function requireIntakeUser() {
  const auth = await getCurrentUser()
  if (!auth) throw new IntakeError('ログインしてください。', 401)
  return auth.user.id
}
export async function requireIntakeOwner(listingId: string, userId: string) {
  if (!validId(listingId)) throw new IntakeError('事業所が見つかりません。', 404)
  const { data, error } = await getSupabaseServiceClient().rpc('cares_intake_recipients', { p_listing: listingId })
  if (error) throw new Error('owner lookup failed')
  if (!data?.some((row: { user_id: string }) => row.user_id === userId)) throw new IntakeError('この事業所の申込みを確認する権限がありません。', 403)
}
