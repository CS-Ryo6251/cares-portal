'use client'

import { useEffect, useRef, useState } from 'react'
import { LockKeyhole, Plus } from 'lucide-react'
import { LIST_KINDS, type ListKind, type ListSummary } from '@/lib/personal-lists'
import { listRequest, ListRequestError } from '@/lib/personal-lists-client'
import PersonalListEditor from './PersonalListEditor'

export default function PersonalListsTab() {
  const [lists, setLists] = useState<ListSummary[]>([]), [active, setActive] = useState<string | null>(null)
  const [loading, setLoading] = useState(true), [more, setMore] = useState(false), [error, setError] = useState(''), [login, setLogin] = useState(false)
  const [title, setTitle] = useState(''), [kind, setKind] = useState<ListKind>('candidates'), [creating, setCreating] = useState(false), [showCreate, setShowCreate] = useState(false)
  const pending = useRef<{ key: string; id: string } | null>(null), busy = useRef(false)
  async function load(offset = 0, signal?: AbortSignal) {
    setLoading(true); setError('')
    try {
      const data = await listRequest<{ lists: ListSummary[]; more: boolean }>(`/api/my-lists?offset=${offset}`, undefined, 'GET', signal)
      if (!signal?.aborted) { setLists(previous => offset ? [...previous, ...data.lists] : data.lists); setMore(data.more); setLogin(false) }
    } catch (error) { if (!signal?.aborted) { setError((error as Error).message); setLogin(error instanceof ListRequestError && error.status === 401) } }
    finally { if (!signal?.aborted) setLoading(false) }
  }
  useEffect(() => { const controller = new AbortController(); void load(0, controller.signal); return () => controller.abort() }, [])
  async function create(event: React.FormEvent) {
    event.preventDefault()
    if (busy.current) return
    busy.current = true; setCreating(true); setError('')
    const key = JSON.stringify({ title, kind })
    if (pending.current?.key !== key) pending.current = { key, id: crypto.randomUUID() }
    try {
      const result = await listRequest<{ id: string }>('/api/my-lists', { id: pending.current.id, title, kind })
      pending.current = null; setTitle(''); setShowCreate(false); setActive(result.id)
    } catch (error) { setError((error as Error).message) }
    finally { busy.current = false; setCreating(false) }
  }
  if (active) return <PersonalListEditor key={active} id={active} onBack={() => { setActive(null); void load() }} onOpen={setActive} />
  return <section aria-label="マイリスト" className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">マイリスト</h2><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><LockKeyhole className="h-3.5 w-3.5" />自分用の候補・おすすめを整理できます。</p></div><button onClick={() => setShowCreate(value => !value)} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-slate-800 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />新しいリスト</button></div>
    {error && <p role="alert" className="rounded-xl bg-white p-4 text-sm text-rose-700">{error} {login ? <a href="/login?redirect=%2Fmy-actions%3Ftab%3Dlists" className="underline">ログイン</a> : <button disabled={loading} onClick={() => void load()} className="min-h-11 px-2 underline">再読み込み</button>}</p>}
    {showCreate && <form onSubmit={create} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><label className="block text-sm font-semibold">リスト名（自分専用）<input required maxLength={80} value={title} disabled={creating} onChange={e => setTitle(e.target.value)} placeholder="例：Aさん・見学候補" className="mt-2 min-h-11 w-full rounded-xl border px-3 font-normal" /></label><label className="block text-sm font-semibold">種類<select value={kind} disabled={creating} onChange={e => setKind(e.target.value as ListKind)} className="mt-2 min-h-11 w-full rounded-xl border bg-white px-3 font-normal">{Object.entries(LIST_KINDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button disabled={creating || !title.trim()} className="min-h-11 rounded-full bg-slate-800 px-5 text-sm font-bold text-white disabled:opacity-40">{creating ? '作成中…' : 'リストを作る'}</button></form>}
    {loading && <p role="status" className="text-sm text-slate-500">読み込み中…</p>}
    {!loading && !error && !lists.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-7 text-center"><p className="font-semibold text-slate-700">利用者ごとに、候補をまとめましょう。</p><p className="mt-2 text-sm text-slate-500">事業所ページの「候補に追加」からも作れます。</p></div>}
    <div className="grid gap-3 sm:grid-cols-2">{lists.map(list => <button key={list.id} onClick={() => setActive(list.id)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left hover:border-slate-400"><p className="text-xs text-slate-500">{LIST_KINDS[list.kind]}{list.kind === 'recommendations' ? ' · 非公開' : list.shared ? ' · 共有中' : ' · 未共有'}</p><h3 className="mt-2 break-words font-bold text-slate-900">{list.title}</h3><p className="mt-3 text-sm text-slate-500">{list.listing_ids.length}件</p></button>)}</div>
    {more && <button disabled={loading} onClick={() => void load(lists.length)} className="min-h-11 text-sm underline">もっと見る</button>}
  </section>
}
