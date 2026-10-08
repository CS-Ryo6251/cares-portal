'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, Copy, LockKeyhole, Trash2 } from 'lucide-react'
import { LIST_KINDS, type ListFacility, type PersonalList } from '@/lib/personal-lists'
import { listRequest } from '@/lib/personal-lists-client'
import PersonalListSharing from './PersonalListSharing'

type Detail = { list: PersonalList; facilities: Record<string, ListFacility> }
export default function PersonalListEditor({ id, onBack, onOpen }: { id: string; onBack: () => void; onOpen: (id: string) => void }) {
  const [detail, setDetail] = useState<Detail | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setDetail(null)
    listRequest<Detail>(`/api/my-lists/${id}`, undefined, 'GET', controller.signal)
      .then(value => { if (!controller.signal.aborted) setDetail(value) })
      .catch(error => { if (!controller.signal.aborted) setError(error.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [id, retry])
  if (detail) return <Editor key={`${id}:${retry}`} detail={detail} onBack={onBack} onOpen={onOpen} onReload={() => setRetry(value => value + 1)} />
  return <div className="space-y-4"><button onClick={onBack} className="min-h-11 text-sm underline">リスト一覧へ</button>{loading ? <p role="status">読み込み中…</p> : <><p role="alert" className="text-sm text-rose-700">{error}</p><button onClick={() => setRetry(value => value + 1)} className="min-h-11 text-sm underline">再読み込み</button></>}</div>
}

function Editor({ detail, onBack, onOpen, onReload }: { detail: Detail; onBack: () => void; onOpen: (id: string) => void; onReload: () => void }) {
  const [list, setList] = useState(detail.list), [title, setTitle] = useState(detail.list.title), [entries, setEntries] = useState(detail.list.entries)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  const [selected, setSelected] = useState<string[]>([]), [copyTitle, setCopyTitle] = useState(''), [copying, setCopying] = useState(false)
  const locked = useRef(false), pendingCopy = useRef<{ key: string; id: string } | null>(null)
  const dirty = title !== list.title || JSON.stringify(entries) !== JSON.stringify(list.entries)
  useEffect(() => {
    if (!dirty && !busy) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const navigate = (event: Event) => { if (busy || !window.confirm('保存していない変更があります。変更を破棄して移動しますか？')) event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    window.addEventListener('cares:my-actions-navigate', navigate)
    return () => { window.removeEventListener('beforeunload', warn); window.removeEventListener('cares:my-actions-navigate', navigate) }
  }, [dirty, busy])
  const leave = () => !dirty || window.confirm('保存していない変更があります。変更を破棄して移動しますか？')
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (locked.current) return
    locked.current = true; setBusy(true); setError(''); setMessage('')
    try {
      const result = await listRequest<{ list: PersonalList }>(`/api/my-lists/${list.id}`, { action: 'save', version: list.version, title, entries }, 'PATCH')
      setList(result.list); setTitle(result.list.title); setEntries(result.list.entries); setMessage('保存しました。')
    } catch (error) { setError((error as Error).message) }
    finally { locked.current = false; setBusy(false) }
  }
  function edit(id: string, key: 'private_note' | 'public_note', value: string) {
    setMessage(''); setEntries(rows => rows.map(row => row.listing_id === id ? { ...row, [key]: value } : row))
  }
  function move(index: number, step: number) {
    setMessage(''); setEntries(rows => { const next = [...rows]; [next[index], next[index + step]] = [next[index + step], next[index]]; return next })
  }
  async function copy(event: React.FormEvent) {
    event.preventDefault()
    if (locked.current || dirty) return
    locked.current = true; setBusy(true); setError('')
    const key = JSON.stringify({ title: copyTitle, selected, version: list.version })
    if (pendingCopy.current?.key !== key) pendingCopy.current = { key, id: crypto.randomUUID() }
    try {
      const result = await listRequest<{ id: string }>('/api/my-lists', { id: pendingCopy.current.id, title: copyTitle, kind: 'candidates', source_id: list.id, source_version: list.version, selected_ids: selected })
      onOpen(result.id)
    } catch (error) { setError((error as Error).message) }
    finally { locked.current = false; setBusy(false) }
  }
  async function remove() {
    if (locked.current || !window.confirm(`「${list.title}」を削除しますか？発行済みの共有リンクも無効になります。`)) return
    locked.current = true; setBusy(true); setError('')
    try { await listRequest(`/api/my-lists/${list.id}`, { version: list.version }, 'DELETE'); onBack() }
    catch (error) { setError((error as Error).message) }
    finally { locked.current = false; setBusy(false) }
  }
  function updated(value: PersonalList) { setList(value); setTitle(value.title); setEntries(value.entries) }
  return <section className="space-y-5" aria-label="リストの編集">
    <div className="flex flex-wrap items-center justify-between gap-2"><button disabled={busy} onClick={() => { if (leave()) onBack() }} className="inline-flex min-h-11 items-center gap-1 text-sm text-slate-600"><ArrowLeft className="h-4 w-4" />リスト一覧へ</button><span className="inline-flex items-center gap-1 text-xs text-slate-500"><LockKeyhole className="h-3.5 w-3.5" />{LIST_KINDS[list.kind]}{list.kind === 'recommendations' ? ' · 非公開' : ''}</span></div>
    {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}<button disabled={busy} onClick={() => { if (leave()) onReload() }} className="block min-h-11 underline">最新のリストを読み込む</button></div>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    <form onSubmit={save} className="space-y-4"><fieldset disabled={busy} className="min-w-0 space-y-4">
      <label className="block text-xs font-semibold text-slate-600">リスト名（自分専用）<input required maxLength={80} value={title} onChange={e => { setTitle(e.target.value); setMessage('') }} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-lg font-bold text-slate-900" /></label>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-slate-500">{entries.length}件 · 矢印で順番を変更</p><a href="/" onClick={event => { if (!leave()) event.preventDefault() }} className="inline-flex min-h-11 items-center text-sm font-semibold underline">事業所をさがして追加</a></div>
      {entries.length === 0 && <p className="rounded-2xl border border-dashed bg-white p-6 text-sm text-slate-500">事業所の「候補に追加」から、このリストを選んでください。</p>}
      {entries.map((entry, index) => {
        const facility = detail.facilities[entry.listing_id], name = facility?.name || '掲載を確認できない事業所'
        return <article key={entry.listing_id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-start gap-3"><span className="flex h-8 min-w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 px-2 font-bold text-stone-700">{list.kind === 'recommendations' ? `${index + 1}位` : index + 1}</span><div className="min-w-0 flex-1"><h3 className="break-words font-bold text-slate-900">{name}</h3><p className="mt-1 text-xs text-slate-500">{facility?.service_type}</p></div></div>
          <div className="flex flex-wrap items-center gap-1"><button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`${name}を上へ`} className="flex h-11 w-11 items-center justify-center rounded-full border disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button><button type="button" disabled={index === entries.length - 1} onClick={() => move(index, 1)} aria-label={`${name}を下へ`} className="flex h-11 w-11 items-center justify-center rounded-full border disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>{facility && <a href={`/directory/${facility.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center px-3 text-xs underline">事業所を見る</a>}<button type="button" onClick={() => { setEntries(rows => rows.filter(row => row.listing_id !== entry.listing_id)); setSelected(ids => ids.filter(id => id !== entry.listing_id)); setMessage('') }} aria-label={`${name}を候補から外す`} className="ml-auto flex min-h-11 items-center gap-1 px-2 text-xs text-slate-500"><Trash2 className="h-4 w-4" />外す</button></div>
          <label className="block text-xs font-semibold text-slate-600">自分用メモ（非公開）<textarea maxLength={1000} rows={2} value={entry.private_note} onChange={e => edit(entry.listing_id, 'private_note', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal leading-6" /></label>
          {list.kind === 'candidates' && <label className="block text-xs font-semibold text-slate-600">家族に見せる紹介コメント<textarea maxLength={300} rows={2} value={entry.public_note} onChange={e => edit(entry.listing_id, 'public_note', e.target.value)} placeholder="例：ご自宅から近く、通いやすい候補です。" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal leading-6" /></label>}
        </article>
      })}
      <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg"><p className="text-xs text-slate-500">{dirty ? '保存していない変更があります' : '保存済み'}</p><button disabled={busy || !dirty || !title.trim()} className="min-h-11 rounded-full bg-slate-800 px-5 text-sm font-bold text-white disabled:opacity-40">{busy ? '処理中…' : '変更を保存'}</button></div>
    </fieldset></form>
    <div className="rounded-2xl border border-slate-200 bg-white p-5"><button disabled={busy || dirty || !entries.length} onClick={() => setCopying(value => !value)} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold disabled:opacity-40"><Copy className="h-4 w-4" />選んだ事業所を、新しい候補リストへ</button>{dirty && <p className="text-xs text-slate-500">コピー・共有の前に変更を保存してください。</p>}
      {copying && <form onSubmit={copy} className="mt-3 space-y-3"><fieldset disabled={busy || dirty} className="space-y-3"><p className="text-xs text-slate-500">自分用メモを引き継ぎ、紹介コメントは空にして作成します。</p>{entries.map(entry => <label key={entry.listing_id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(entry.listing_id)} onChange={e => setSelected(ids => e.target.checked ? [...ids, entry.listing_id] : ids.filter(id => id !== entry.listing_id))} className="h-5 w-5" />{detail.facilities[entry.listing_id]?.name || '掲載を確認できない事業所'}</label>)}<label className="block text-xs font-semibold">新しい候補リスト名<input required maxLength={80} value={copyTitle} onChange={e => setCopyTitle(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border px-3 text-sm font-normal" /></label><button disabled={!selected.length || !copyTitle.trim()} className="min-h-11 rounded-full bg-slate-800 px-5 text-sm font-bold text-white disabled:opacity-40">選択した{selected.length}件で作成</button></fieldset></form>}
    </div>
    {list.kind === 'candidates' && <PersonalListSharing list={list} facilities={detail.facilities} disabled={busy || dirty} onBusy={value => { locked.current = value; setBusy(value) }} onUpdate={updated} />}
    <button disabled={busy} onClick={remove} className="inline-flex min-h-11 items-center gap-2 text-xs text-slate-500 underline"><Trash2 className="h-4 w-4" />このリストを削除</button>
  </section>
}
