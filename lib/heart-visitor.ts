import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import type { NextRequest, NextResponse } from 'next/server'
import { UUID_PATTERN } from './community'

const COOKIE = 'cares-heart-visitor'
function hash(purpose: string, value: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Heart visitor signing is unavailable')
  return createHmac('sha256', key).update(`cares-hearts:${purpose}:${value}`).digest('hex')
}

export function heartVisitor(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE)?.value || ''
  const [candidate, signature] = cookie.split('.')
  const valid = UUID_PATTERN.test(candidate || '') && /^[a-f0-9]{64}$/.test(signature || '')
    && timingSafeEqual(Buffer.from(signature), Buffer.from(hash('cookie', candidate)))
  const id = valid ? candidate : randomUUID()
  // On Vercel these headers are set by the platform, not the browser.
  const ip = (request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for'))?.split(',')[0]?.trim() || 'unknown'
  return {
    visitorHash: hash('visitor', id), networkHash: hash('network', ip),
    cookieValue: valid ? null : `${id}.${hash('cookie', id)}`,
  }
}

export function setHeartVisitor(response: NextResponse, visitor: ReturnType<typeof heartVisitor>) {
  if (visitor.cookieValue) response.cookies.set(COOKIE, visitor.cookieValue, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    path: '/', maxAge: 60 * 60 * 24 * 365,
  })
  return response
}
