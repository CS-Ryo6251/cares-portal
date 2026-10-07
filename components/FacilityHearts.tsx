'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Heart } from 'lucide-react'
import Link from 'next/link'
import { formatHearts } from '@/lib/community'
import type { HeartSummary } from '@/lib/hearts'

export default function FacilityHearts({ listingId }: { listingId: string }) {
  const [summary, setSummary] = useState<HeartSummary | null>(null)
  const [error, setError] = useState('')
  const [loginNeeded, setLoginNeeded] = useState(false)
  const [saving, setSaving] = useState(false)
  const pendingId = useRef<string | null>(null)
  const busy = useRef(false)
  const [sent, setSent] = useState(false)
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/directory/${listingId}/hearts`, { cache: 'no-store' })
      if (!res.ok) throw new Error()
      setSummary(await res.json())
      setError('')
    } catch { setError('ハートを読み込めませんでした。再読み込みできます。') }
  }, [listingId])
  useEffect(() => { void load() }, [load])

  async function sendHeart() {
    if (busy.current) return
    busy.current = true
    setSaving(true)
    setError('')
    setSent(false)
    pendingId.current ||= crypto.randomUUID()
    try {
      const res = await fetch(`/api/directory/${listingId}/hearts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: pendingId.current }),
      })
      const data = await res.json()
      if (res.status === 401) { setLoginNeeded(true); pendingId.current = null; return }
      if (!res.ok) {
        if (res.status === 429 || res.status === 400 || res.status === 404) pendingId.current = null
        throw new Error(data.error || '送信結果を確認できませんでした')
      }
      setSummary(data)
      pendingId.current = null
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '送信結果を確認できませんでした')
    } finally { busy.current = false; setSaving(false) }
  }

  return <section className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/60 p-5">
    <h2 className="text-lg font-bold text-gray-900">この事業所に「いいね」を届ける</h2>
    <p className="mt-2 text-sm text-gray-600">良いな、ありがとう。そんな気持ちをハートで伝えませんか。</p>
    <div className="mt-4 flex flex-wrap items-center gap-4">
      <button onClick={sendHeart} disabled={saving || !summary}
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-rose-600 px-5 py-3 font-bold text-white hover:bg-rose-700 disabled:opacity-50">
        <Heart aria-hidden="true" className="h-5 w-5 fill-current" />
        {saving ? '送信中…' : pendingId.current ? '送信結果を再確認' : 'いいね・応援する'}
      </button>
      <div aria-live="polite"><p className="text-2xl font-bold text-rose-700">♡ {formatHearts(summary?.total)}</p>
        <p className="text-xs text-gray-600">{formatHearts(summary?.supporters)}人からの応援</p></div>
    </div>
    <p className="mt-3 text-xs leading-5 text-gray-600">ハートは応援の累計です。上限はなく、同じ方が何度でも送れます。事業所選びには、良いところや受入条件もあわせてご覧ください。</p>
    {sent && <p role="status" className="mt-2 text-sm text-rose-700">応援を届けました。ありがとうございます。</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error} {!summary && <button onClick={load} className="underline">再読み込み</button>}</p>}
    {loginNeeded && <p className="mt-2 text-sm"><Link className="text-rose-700 underline" href={`/login?redirect=${encodeURIComponent(`/directory/${listingId}`)}`}>ログインして応援する</Link></p>}
  </section>
}
