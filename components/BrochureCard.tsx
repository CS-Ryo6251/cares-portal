'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Bookmark, Download, FileText, Share2, ThumbsUp, Trash2, Pencil, Flag } from 'lucide-react'
import { brochureDate, type Brochure } from '@/lib/brochures'
import BrochureForm from './BrochureForm'

export default function BrochureCard({ item, onChange, expanded = false }: { item: Brochure; onChange: () => void; expanded?: boolean }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [needsLogin, setNeedsLogin] = useState(false)
  const [editing, setEditing] = useState(false), [deleting, setDeleting] = useState(false), [reporting, setReporting] = useState(false), [reason, setReason] = useState('')
  async function mutate(body?: Record<string, unknown>) {
    setBusy(true); setMessage(''); setNeedsLogin(false)
    try {
      const response = await fetch(`/api/brochures/${item.id}`, body ? { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { method: 'DELETE' })
      const result = await response.json()
      if (response.status === 401) setNeedsLogin(true)
      if (!response.ok) throw new Error(result.error || '処理できませんでした。')
      setDeleting(false); setReporting(false)
      if (body?.action === 'report') setMessage('報告を受け付けました。')
      onChange()
    } catch (error) { setMessage(error instanceof Error ? error.message : '通信に失敗しました。再度お試しください。') }
    finally { setBusy(false) }
  }
  async function share() {
    const url = `${location.origin}/brochures/${item.id}`
    try {
      if (navigator.share) await navigator.share({ title: `${item.facilityName}｜${item.title}`, url })
      else { await navigator.clipboard.writeText(url); setMessage('共有リンクをコピーしました。') }
    } catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) setMessage('リンクをコピーできませんでした。資料を開いてURLを共有してください。') }
  }
  const button = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-slate-600 disabled:opacity-50'
  const published = item.status === 'published'
  return <article className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5" aria-label={item.title}>
    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f1f4ee] px-2.5 py-1 text-[11px] font-semibold text-[#526b58]">ユーザー共有</span>{item.mine && <span className="text-xs text-slate-500">あなたの資料</span>}{!published && <span className="text-xs text-amber-700">{item.status === 'uploading' ? 'アップロード未完了' : '報告により非公開'}</span>}</div>
    <h3 className="mt-3 break-words text-base font-bold text-slate-900">{expanded || !published ? item.title : <Link href={`/brochures/${item.id}`} className="hover:underline">{item.title}</Link>}</h3>
    <Link href={`/directory/${item.listingId}`} className="mt-1 block break-words text-xs text-slate-500 hover:underline">{item.facilityName}</Link>
    <p className="mt-3 text-xs leading-6 text-slate-500">{item.issuedMonth ? `発行 ${item.issuedMonth.replace('-', '年')}月` : '発行時期不明'} · 共有 {brochureDate(item.createdAt)}</p>
    {item.note && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{item.note}</p>}
    {published && <div className="mt-4 space-y-2">{item.files.map(file => <div key={file.index}>
      {expanded && file.mime.startsWith('image/') && /* eslint-disable-next-line @next/next/no-img-element */
        <img src={`/api/brochures/${item.id}/file?index=${file.index}`} alt={`${item.title} 写真${file.index + 1}`} className="mb-2 max-h-[70vh] w-full rounded-xl border border-stone-100 object-contain" />}
      <a href={`/api/brochures/${item.id}/file?index=${file.index}`} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm font-semibold text-slate-700"><FileText className="h-4 w-4 shrink-0" />{file.mime === 'application/pdf' ? 'PDFをダウンロード' : '写真を開く'}{item.files.length > 1 && ` ${file.index + 1}`}<span className="ml-auto shrink-0 text-xs font-normal text-slate-500">{(file.size / 1024 / 1024).toFixed(1)}MB</span><Download className="h-4 w-4 shrink-0" /></a>
    </div>)}</div>}
    <div className="mt-4 flex flex-wrap gap-2">
      {published && <>
        <button disabled={busy || item.mine} aria-pressed={item.helpful} onClick={() => mutate({ action: 'helpful', enabled: !item.helpful })} className={`${button} ${item.helpful ? '!border-[#9aad97] !bg-[#f1f4ee] !text-[#526b58]' : ''}`}><ThumbsUp className="h-4 w-4" />役に立った {item.helpfulCount}</button>
        <button disabled={busy} aria-pressed={item.saved} onClick={() => mutate({ action: 'saved', enabled: !item.saved })} className={`${button} ${item.saved ? '!bg-[#f1f4ee] !text-[#526b58]' : ''}`}><Bookmark className={`h-4 w-4 ${item.saved ? 'fill-current' : ''}`} />{item.saved ? '保存済み' : '保存'}</button>
        <button onClick={share} className={button}><Share2 className="h-4 w-4" />共有</button>
      </>}
      {item.mine && <>
        {published && <button disabled={busy} onClick={() => setEditing(!editing)} className={button}><Pencil className="h-4 w-4" />編集</button>}
        <button disabled={busy} onClick={() => setDeleting(!deleting)} className={button}><Trash2 className="h-4 w-4" />削除</button>
      </>}
      {!item.mine && published && <button disabled={busy} onClick={() => setReporting(!reporting)} className="inline-flex min-h-11 items-center gap-1 px-2 text-xs text-slate-400"><Flag className="h-3.5 w-3.5" />報告</button>}
    </div>
    {deleting && <div className="mt-3 rounded-xl bg-stone-50 p-3 text-sm"><p>この資料を削除しますか？共有URLからも見られなくなります。</p><button disabled={busy} onClick={() => mutate()} className="mt-2 min-h-11 rounded-lg bg-slate-800 px-4 font-bold text-white">削除する</button><button onClick={() => setDeleting(false)} className="min-h-11 px-3">戻る</button></div>}
    {reporting && <form className="mt-3 rounded-xl bg-stone-50 p-3" onSubmit={event => { event.preventDefault(); mutate({ action: 'report', reason }) }}><label className="text-sm">報告内容<textarea required maxLength={300} value={reason} onChange={event => setReason(event.target.value)} placeholder="例：別の事業所の資料が掲載されています" className="mt-2 block w-full rounded-xl border border-stone-200 p-3 text-sm" /></label><button disabled={busy} className="mt-2 min-h-11 rounded-lg bg-slate-800 px-4 text-sm font-bold text-white">報告する</button></form>}
    {editing && <BrochureForm listingId={item.listingId} initial={item} onDone={() => { setEditing(false); onChange() }} onCancel={() => setEditing(false)} />}
    {message && <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>}
    {needsLogin && <Link href={`/login?redirect=${encodeURIComponent(`/brochures/${item.id}`)}`} className="mt-2 inline-block text-sm font-bold text-[#526b58] underline">ログインする</Link>}
  </article>
}
