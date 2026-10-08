'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Plus, Loader2 } from 'lucide-react'
import type { BrochureList } from '@/lib/brochures'
import BrochureCard from './BrochureCard'
import BrochureForm from './BrochureForm'

export default function BrochureCollection({ listingId, mine = false }: { listingId?: string; mine?: boolean }) {
  const [mode, setMode] = useState('shared'), [offset, setOffset] = useState(0), [revision, setRevision] = useState(0)
  const [data, setData] = useState<BrochureList | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [needsLogin, setNeedsLogin] = useState(false)
  const [adding, setAdding] = useState(false), [shared, setShared] = useState('')
  function reload() { setOffset(0); setRevision(value => value + 1) }
  useEffect(() => {
    const controller = new AbortController(); let active = true
    setLoading(true); setError(''); setNeedsLogin(false)
    const params = new URLSearchParams(mine ? { mode, offset: String(offset) } : { listing: listingId || '', offset: String(offset) })
    fetch(`/api/brochures?${params}`, { cache: 'no-store', signal: controller.signal }).then(async response => {
      const body = await response.json()
      if (!active) return
      if (response.status === 401) setNeedsLogin(true)
      if (!response.ok) throw new Error(body.error || '資料を読み込めませんでした。')
      setData(previous => ({ ...body, items: offset && previous ? [...previous.items, ...body.items.filter((item: { id: string }) => !previous.items.some(existing => existing.id === item.id))] : body.items }))
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : '資料を読み込めませんでした。') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
  }, [listingId, mine, mode, offset, revision])
  const login = `/login?redirect=${encodeURIComponent(mine ? '/my-actions?tab=brochures' : `/directory/${listingId}#brochures`)}`
  return <section id="brochures" className="min-w-0 scroll-mt-24 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><FileText className="h-5 w-5 text-[#7a8d7b]" />{mine ? 'あなたの資料' : 'みんなのパンフレット'}</h2>{!mine && <button disabled={loading || Boolean(error)} onClick={() => setAdding(!adding)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#f1f4ee] px-3 text-sm font-bold text-[#526b58] disabled:opacity-50"><Plus className="h-4 w-4" />パンフレットを共有</button>}</div>
    {!mine && <p className="mt-2 text-xs leading-6 text-slate-500">地域のみんなが持ち寄った事業所の資料です。</p>}
    {mine && <>
      {data?.summary && <dl className="my-5 grid grid-cols-3 gap-2">{[['共有した資料', data.summary.shared], ['役に立った', data.summary.helpful], ['保存した資料', data.summary.saved]].map(([label, count]) => <div key={label} className="rounded-xl bg-[#f6f8f3] p-3 text-center"><dt className="text-[11px] text-slate-500">{label}</dt><dd className="mt-1 text-xl font-bold text-[#526b58]">{count}</dd></div>)}</dl>}
      <div className="my-4 flex gap-2">{[['shared', '共有した資料'], ['saved', '保存した資料']].map(([key, label]) => <button key={key} aria-pressed={mode === key} onClick={() => { setMode(key); setOffset(0); setData(null); setShared('') }} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${mode === key ? 'bg-slate-800 text-white' : 'bg-stone-50 text-slate-600'}`}>{label}</button>)}</div>
    </>}
    {adding && (data?.authenticated ? <BrochureForm listingId={listingId!} onDone={id => { setAdding(false); setShared(id); reload() }} onCancel={() => setAdding(false)} /> : <div className="mt-4 rounded-xl bg-[#f6f8f3] p-4 text-sm"><p>ログインすると、資料を共有・管理できます。</p><Link href={login} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#526b58] px-4 font-bold text-white">ログインして共有</Link></div>)}
    {shared && <p role="status" className="mt-4 text-sm text-[#526b58]">資料を公開しました。<Link href={`/brochures/${shared}`} className="ml-2 font-bold underline">共有ページを開く</Link></p>}
    {error && <div role="alert" className="mt-4 text-sm text-slate-600"><p>{error}</p>{needsLogin ? <Link href={login} className="mt-2 inline-flex min-h-11 items-center font-bold text-[#526b58] underline">ログインする</Link> : <button onClick={reload} className="mt-2 min-h-11 font-bold underline">再読み込み</button>}</div>}
    {!error && data?.items.length === 0 && !loading && <p className="py-7 text-center text-sm text-slate-500">{mine ? mode === 'shared' ? 'まだ共有した資料はありません。' : '資料の「保存」から、ここに残せます。' : '最初のパンフレットを共有しませんか。'}</p>}
    <div className="mt-4 space-y-3">{data?.items.map(item => <BrochureCard key={item.id} item={item} onChange={reload} />)}</div>
    {loading && <p role="status" className="flex items-center justify-center gap-2 py-5 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />読み込み中</p>}
    {!loading && !error && data?.hasMore && <button onClick={() => setOffset(data.nextOffset)} className="mt-4 min-h-11 w-full rounded-xl border border-stone-200 text-sm font-semibold">もっと見る</button>}
  </section>
}
