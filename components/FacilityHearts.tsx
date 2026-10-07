'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Heart } from 'lucide-react'
import { formatHearts } from '@/lib/community'
import type { HeartSummary } from '@/lib/hearts'

async function requestHeart(url: string, init?: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    return { res, data: await res.json() }
  } finally { clearTimeout(timeout) }
}

function newRequestId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export default function FacilityHearts({ listingId }: { listingId: string }) {
  const [summary, setSummary] = useState<HeartSummary | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const pendingId = useRef<string | null>(null)
  const busy = useRef(false)
  const [sent, setSent] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { res, data } = await requestHeart(`/api/directory/${listingId}/hearts`, { cache: 'no-store' })
      if (!res.ok || !/^\d+$/.test(data?.total)) throw new Error()
      setSummary({ total: data.total })
      setError('')
    } catch { setError('ハートを読み込めませんでした。再読み込みできます。') }
    finally { setLoading(false) }
  }, [listingId])
  useEffect(() => { void load() }, [load])

  async function sendHeart() {
    if (busy.current) return
    busy.current = true
    setSaving(true)
    setError('')
    setSent(false)
    try {
      pendingId.current ||= newRequestId()
      const { res, data } = await requestHeart(`/api/directory/${listingId}/hearts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: pendingId.current }),
      })
      if (!res.ok) {
        if (res.status === 429 || res.status === 400 || res.status === 404) pendingId.current = null
        throw new Error(data.error || '送信結果を確認できませんでした')
      }
      if (!/^\d+$/.test(data?.total)) throw new Error('送信結果を確認できませんでした')
      setSummary({ total: data.total })
      pendingId.current = null
      setSent(true)
    } catch (e) {
      setError(e instanceof Error && e.name !== 'AbortError' ? e.message : '送信結果を確認できませんでした。「送信結果を再確認」で確認できます。')
    } finally { busy.current = false; setSaving(false) }
  }

  return <section className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/60 p-5">
    <h2 className="text-lg font-bold text-gray-900">この事業所に「いいね」を届ける</h2>
    <p className="mt-2 text-sm text-gray-600">良いな、ありがとう。ログインなしで、気軽に応援できます。</p>
    <div className="mt-4 flex flex-wrap items-center gap-4">
      <button onClick={sendHeart} disabled={saving || !summary} aria-busy={saving}
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-rose-600 px-5 py-3 font-bold text-white transition hover:bg-rose-700 active:scale-95 disabled:opacity-50">
        <Heart aria-hidden="true" className={`h-5 w-5 fill-current ${saving ? 'motion-safe:animate-pulse' : ''}`} />
        {loading ? '読み込み中…' : saving ? '応援を届けています…' : !summary ? '読込を再試行してください' : pendingId.current ? '送信結果を再確認' : sent ? 'もう一度応援する' : 'いいね・応援する'}
      </button>
      <div aria-live="polite"><p className="text-2xl font-bold text-rose-700">♡ {formatHearts(summary?.total)}</p>
        <p className="text-xs text-gray-600">応援の累計</p></div>
    </div>
    {sent && <p role="status" className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-rose-700">♡ 応援を届けました！ありがとうございます。</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error} {!summary && <button onClick={load} className="underline">再読み込み</button>}</p>}
    <p className="mt-3 text-xs leading-5 text-gray-600">ハートの累計に上限はなく、同じ方が何度でも送れます。続けて押すときは少し間をあけてください。事業所選びには、良いところや受入条件もあわせてご覧ください。</p>
  </section>
}
