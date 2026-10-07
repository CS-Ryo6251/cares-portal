'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Heart } from 'lucide-react'
import { compactHearts, formatHearts } from '@/lib/community'


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

export default function FacilityHearts({ listingId, listingIds, variant = 'card', postCount, photoCount }: { listingId?: string; listingIds?: string[]; variant?: 'card' | 'profile'; postCount?: number | null; photoCount?: number }) {
  const idsKey = [...new Set(listingIds || (listingId ? [listingId] : []))].join(',')
  const ids = useMemo(() => idsKey ? idsKey.split(',') : [], [idsKey])
  const [totals, setTotals] = useState<Record<string, string> | null>(null)
  const summary = totals ? { total: Object.values(totals).reduce((sum, total) => sum + BigInt(total), BigInt(0)).toString() } : null
  const revision = useRef(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const pendingId = useRef<string | null>(null)
  const busy = useRef(false)
  const [sent, setSent] = useState(false)
  const load = useCallback(async () => {
    const current = revision.current
    setLoading(true)
    try {
      const values = await Promise.all(ids.map(async id => {
        const { res, data } = await requestHeart(`/api/directory/${id}/hearts`, { cache: 'no-store' })
        if (!res.ok || typeof data?.total !== 'string' || !/^\d+$/.test(data.total)) throw new Error()
        return [id, data.total] as const
      }))
      if (current !== revision.current) return
      setTotals(ids.length ? Object.fromEntries(values) : null)
      setError('')
    } catch { if (current === revision.current) setError('ハートを読み込めませんでした。再読み込みできます。') }
    finally { if (current === revision.current) setLoading(false) }
  }, [ids])
  useEffect(() => {
    revision.current += 1
    setTotals(null); setSent(false); pendingId.current = null; busy.current = false; setSaving(false)
    void load()
    return () => { revision.current += 1 }
  }, [load])

  async function sendHeart() {
    if (busy.current || !ids[0]) return
    const current = revision.current
    busy.current = true
    setSaving(true)
    setError('')
    setSent(false)
    try {
      pendingId.current ||= newRequestId()
      const { res, data } = await requestHeart(`/api/directory/${ids[0]}/hearts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: pendingId.current }),
      })
      if (current !== revision.current) return
      if (!res.ok) {
        if (res.status === 429 || res.status === 400 || res.status === 404) pendingId.current = null
        throw new Error(data.error || '送信結果を確認できませんでした')
      }
      if (typeof data?.total !== 'string' || !/^\d+$/.test(data.total)) throw new Error('送信結果を確認できませんでした')
      setTotals(previous => previous ? { ...previous, [ids[0]]: data.total } : null)
      pendingId.current = null
      setSent(true)
    } catch (e) {
      if (current !== revision.current) return
      setError(e instanceof Error && e.name !== 'AbortError' ? e.message : '送信結果を確認できませんでした。「送信結果を再確認」で確認できます。')
    } finally { if (current === revision.current) { busy.current = false; setSaving(false) } }
  }

  const button = <button onClick={sendHeart} disabled={saving || loading || !summary} aria-busy={saving}
    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-700 active:scale-95 disabled:opacity-50">
    <Heart aria-hidden="true" className={`h-4 w-4 fill-current ${saving ? 'motion-safe:animate-pulse' : ''}`} />
    {loading ? '読み込み中…' : saving ? '応援を届けています…' : !summary ? '応援する' : pendingId.current ? '送信結果を再確認' : sent ? 'もう一度応援する' : 'いいね・応援する'}
  </button>
  const feedback = <>
    {sent && <p role="status" className="mt-3 text-sm font-semibold text-rose-700">♡ 応援を届けました。ありがとうございます！</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error} <button onClick={load} className="min-h-11 underline">再読み込み</button></p>}
  </>
  const exact = summary && <details className="mt-2 text-xs text-slate-500">
    <summary className="w-fit cursor-pointer py-2 underline underline-offset-4">正確な累計を見る</summary>
    <p className="mt-1 max-w-full break-all rounded-xl bg-rose-50 p-3 tabular-nums">{formatHearts(summary.total)} ハート</p>
    <p className="mt-2 leading-5">{ids.length > 1 ? '連携したサービスへの応援を合計しています。' : ''}同じ方が何度でも送れる応援の累計です。</p>
  </details>
  if (variant === 'profile') return <section aria-label="事業所への応援" className="border-t border-slate-100 pt-4">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-5 text-sm">
        <div aria-live="polite" className="min-w-0" title={formatHearts(summary?.total)}><span className="text-xl font-extrabold tabular-nums text-rose-600">{compactHearts(summary?.total)}</span><span className="ml-1.5 text-xs text-slate-500">応援ハート</span></div>
        {postCount !== undefined && <p><b className="text-lg tabular-nums text-slate-900">{postCount === null ? '—' : postCount.toLocaleString('ja-JP')}</b><span className="ml-1.5 text-xs text-slate-500">投稿</span></p>}
        {photoCount !== undefined && <p><b className="text-lg tabular-nums text-slate-900">{photoCount.toLocaleString('ja-JP')}</b><span className="ml-1.5 text-xs text-slate-500">写真</span></p>}
      </div>
      {ids.length > 0 && button}
    </div>
    {ids.length ? <p className="mt-2 text-xs text-slate-500">ログインなしで、何度でも応援できます。</p> : <p className="mt-2 text-xs text-slate-500">応援は事業所情報の連携後にご利用いただけます。</p>}
    {feedback}{exact}
  </section>
  return <section className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/60 p-5">
    <h2 className="text-lg font-bold text-gray-900">この事業所に「いいね」を届ける</h2>
    <p className="mt-2 text-sm text-gray-600">良いな、ありがとう。ログインなしで、気軽に応援できます。</p>
    <div className="mt-4 flex flex-wrap items-center gap-4">{button}
      <div aria-live="polite" className="min-w-0"><p className="text-2xl font-bold tabular-nums text-rose-700">♡ {compactHearts(summary?.total)}</p><p className="text-xs text-gray-600">応援の累計</p></div>
    </div>
    {exact}{feedback}
    <p className="mt-3 text-xs leading-5 text-gray-600">ハートの累計に上限はなく、同じ方が何度でも送れます。続けて押すときは少し間をあけてください。事業所選びには、良いところや受入条件もあわせてご覧ください。</p>
  </section>
}
