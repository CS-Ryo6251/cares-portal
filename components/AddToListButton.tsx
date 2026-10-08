'use client'

import { useEffect, useRef, useState } from 'react'
import { ListPlus, X } from 'lucide-react'
import { LIST_KINDS, type ListKind, type ListSummary, type PersonalList } from '@/lib/personal-lists'
import { ListRequestError, listRequest } from '@/lib/personal-lists-client'

export default function AddToListButton({ listingId, name }: { listingId: string; name: string }) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"><ListPlus className="h-4 w-4" />候補に追加</button>
    {open && <AddToListDialog listingId={listingId} name={name} onClose={() => setOpen(false)} />}
  </>
}

function AddToListDialog({ listingId, name, onClose }: { listingId: string; name: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [lists, setLists] = useState<ListSummary[]>([])
  const [loading, setLoading] = useState(true), [more, setMore] = useState(false), [login, setLogin] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  const [title, setTitle] = useState(''), [kind, setKind] = useState<ListKind>('candidates')
  const locked = useRef(false), creation = useRef<{ key: string; id: string } | null>(null)
  const [redirect, setRedirect] = useState('/')
  async function load(offset = 0, signal?: AbortSignal) {
    setLoading(true); setError('')
    try {
      const data = await listRequest<{ lists: ListSummary[]; more: boolean }>(`/api/my-lists?offset=${offset}`, undefined, 'GET', signal)
      if (!signal?.aborted) { setLists(previous => offset ? [...previous, ...data.lists] : data.lists); setMore(data.more) }
    } catch (e) { if (!signal?.aborted) { setLogin(e instanceof ListRequestError && e.status === 401); setError((e as Error).message) } }
    finally { if (!signal?.aborted) setLoading(false) }
  }
  useEffect(() => {
    const controller = new AbortController(), opener = document.activeElement, previous = document.body.style.overflow
    setRedirect(location.pathname + location.search)
    dialog.current?.showModal(); document.body.style.overflow = 'hidden'
    void load(0, controller.signal)
    return () => { controller.abort(); document.body.style.overflow = previous; if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true }) }
  }, [])
  async function add(list: ListSummary) {
    if (locked.current) return
    locked.current = true; setBusy(true); setError(''); setMessage('')
    try {
      const { list: updated } = await listRequest<{ list: PersonalList }>(`/api/my-lists/${list.id}`, { action: 'add', listing_id: listingId, version: list.version }, 'PATCH')
      setLists(rows => rows.map(row => row.id === list.id ? { ...row, version: updated.version, listing_ids: updated.entries.map(item => item.listing_id) } : row))
      setMessage(`「${list.title}」に追加しました。`)
    } catch (e) { setError((e as Error).message) }
    finally { locked.current = false; setBusy(false) }
  }
  async function create(event: React.FormEvent) {
    event.preventDefault()
    if (locked.current) return
    locked.current = true; setBusy(true); setError(''); setMessage('')
    const key = JSON.stringify({ title, kind })
    if (creation.current?.key !== key) creation.current = { key, id: crypto.randomUUID() }
    try {
      await listRequest('/api/my-lists', { id: creation.current.id, title, kind, listing_id: listingId })
      creation.current = null; setTitle(''); await load(); setMessage('新しいリストに追加しました。')
    } catch (e) { setError((e as Error).message) }
    finally { locked.current = false; setBusy(false) }
  }
  return <dialog ref={dialog} aria-labelledby="add-list-title" onCancel={event => { event.preventDefault(); if (!locked.current) onClose() }} className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-3xl bg-white p-0 shadow-xl backdrop:bg-black/40">
    <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-3"><h2 id="add-list-title" className="font-bold">リストに追加</h2><button disabled={busy} onClick={onClose} aria-label="候補の追加を閉じる" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-50 disabled:opacity-40"><X className="h-5 w-5" /></button></div>
    <div className="space-y-4 p-5"><p className="break-words font-semibold text-slate-800">{name}</p>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
      {login ? <a href={`/login?redirect=${encodeURIComponent(redirect)}`} className="inline-flex min-h-11 items-center rounded-full bg-slate-800 px-5 text-sm font-bold text-white">ログインしてリストを作る</a> : <>
        {lists.map(list => {
          const added = list.listing_ids.includes(listingId)
          return <div key={list.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3"><div className="min-w-0"><p className="break-words text-sm font-semibold">{list.title}</p><p className="mt-1 text-xs text-slate-500">{LIST_KINDS[list.kind]} · {list.listing_ids.length}件</p></div><button disabled={busy || added} onClick={() => void add(list)} className="min-h-11 shrink-0 rounded-full bg-slate-100 px-4 text-sm font-semibold disabled:text-slate-400">{added ? '追加済み' : '追加する'}</button></div>
        })}
        {loading && <p role="status" className="text-sm text-slate-500">リストを読み込み中…</p>}
        {!loading && !error && !lists.length && <p className="text-sm text-slate-500">保存先のリストを作りましょう。</p>}
        {more && <button disabled={busy || loading} onClick={() => void load(lists.length)} className="min-h-11 text-sm underline">リストをもっと見る</button>}
        {error && <button disabled={busy || loading} onClick={() => void load()} className="min-h-11 text-sm underline">リストを再読み込み</button>}
        <form onSubmit={create} className="space-y-3 rounded-2xl bg-slate-50 p-4"><h3 className="text-sm font-bold">新しいリストを作る</h3><label className="block text-xs text-slate-600">リスト名（自分専用）<input required maxLength={80} disabled={busy} value={title} onChange={e => setTitle(e.target.value)} placeholder="例：Aさん・見学候補" className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" /></label><label className="block text-xs text-slate-600">種類<select aria-label="種類" disabled={busy} value={kind} onChange={e => setKind(e.target.value as ListKind)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{Object.entries(LIST_KINDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button disabled={busy || loading || !title.trim()} className="min-h-11 rounded-full bg-slate-800 px-5 text-sm font-bold text-white disabled:opacity-40">{busy ? '保存中…' : '作成して追加'}</button></form>
        <a href="/my-actions?tab=lists" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 underline">マイリストを開く</a>
      </>}
    </div>
  </dialog>
}
