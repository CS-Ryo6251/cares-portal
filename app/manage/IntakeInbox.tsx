'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Inbox, Send } from 'lucide-react'
import { INTAKE_STATUSES, REQUEST_TYPES } from '@/lib/intake'
import type { IntakeTarget } from '@/lib/intake-server'

type InboxData = { listings: { id: string; facility_name: string; service_type: string }[]; target: IntakeTarget | null; total: number; applications: { id: string; client_name: string; request_type: keyof typeof REQUEST_TYPES; status: keyof typeof INTAKE_STATUSES; created_at: string }[] }
const control = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base'
export default function IntakeInbox() {
  const [data, setData] = useState<InboxData | null>(null); const [listing, setListing] = useState(''); const [page, setPage] = useState(0)
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [saving, setSaving] = useState(false)
  const [refresh, setRefresh] = useState(0); const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(''); const [enabled, setEnabled] = useState(true); const [status, setStatus] = useState('unknown')
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setNotice('')
    fetch(`/api/intake/manage?listing=${encodeURIComponent(listing)}&page=${page}`, { cache: 'no-store', signal: controller.signal }).then(async response => {
      const body = await response.json(); if (!response.ok) throw new Error(body.error)
      if (controller.signal.aborted) return
      setData(body); setMessage(body.target?.message || ''); setEnabled(body.target?.enabled !== false)
      setStatus(['has_vacancy','accepting'].includes(body.target?.status) ? 'has_vacancy' : ['no_vacancy','not_accepting'].includes(body.target?.status) ? 'no_vacancy' : 'unknown')
    }).catch(e => { if (!controller.signal.aborted) { setError(e.message || '読込みに失敗しました。'); setData(null) } }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [listing, page, refresh])
  async function save() {
    if (!data?.target || saving) return
    setSaving(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/intake/manage', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'settings', listingId: data.target.id, message, enabled, status }) })
      const body = await response.json(); if (!response.ok) throw new Error(body.error)
      setNotice('空き情報と受付設定を保存しました。事業所の公開ページに反映されます。')
    } catch (e) { setError((e as Error).message) } finally { setSaving(false) }
  }
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
    <p className="text-sm font-bold text-rose-600">事業所の管理</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">空き情報・申込み受付</h1><p className="mt-3 text-sm leading-7 text-slate-600">空き状況を伝えて、見学や体験の相談につなげましょう。Caresの確認済みオーナーは、CareSpace OSの契約がなくても受付できます。</p>
    {error && <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}<button className="ml-3 min-h-11 underline" onClick={() => setRefresh(value => value + 1)}>再読み込み</button><Link href="/login?redirect=/manage" className="ml-3 underline">ログイン</Link></div>}
    {loading && <p role="status" className="py-12 text-center text-sm text-slate-500">受付情報を読み込んでいます…</p>}
    {!loading && data && !data.listings.length && <section className="mt-7 rounded-3xl border border-slate-100 bg-white p-7"><h2 className="font-bold">受付できる事業所がまだありません</h2><p className="mt-3 text-sm leading-7 text-slate-600">Caresのオーナー承認、またはOSでの事業所所属と管理者権限が必要です。事業所ページの公式管理申請からお手続きください。</p><Link href="/" className="mt-4 inline-flex min-h-12 items-center font-bold text-rose-700">自分の事業所を探す →</Link></section>}
    {!loading && data?.target && <>
      <div className="my-6 flex flex-wrap items-end gap-4"><label className="min-w-0 flex-1 text-xs font-bold text-slate-500">管理する事業所<select className={control} disabled={saving} value={data.target.id} onChange={e => { setListing(e.target.value); setPage(0) }}>{data.listings.map(item => <option key={item.id} value={item.id}>{item.facility_name} / {item.service_type}</option>)}</select></label><Link href={`/directory/${data.target.id}`} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold">公開ページを見る<ArrowUpRight className="h-4 w-4" /></Link></div>
      <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
        <section className="rounded-3xl border border-rose-100 bg-white p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><Send className="h-5 w-5 text-rose-500" />空き情報を届ける</h2><label className="mt-5 block text-sm font-semibold">現在の空き状況<select className={control} disabled={saving} value={status} onChange={e => setStatus(e.target.value)}><option value="has_vacancy">空きあり</option><option value="no_vacancy">空きなし</option><option value="unknown">要相談・確認中</option></select></label><p className="mt-2 text-xs leading-6 text-slate-500">OSの投稿時に設定する空き状況とも連動します。</p><label className="mt-5 block text-sm font-semibold">ご案内<textarea rows={6} maxLength={1000} className={control} value={message} disabled={saving} placeholder="例：火曜・木曜に空きがあります。午後の見学もご相談ください。" onChange={e => setMessage(e.target.value)} /></label><label className="mt-5 flex items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1 h-4 w-4 accent-rose-600" checked={enabled} disabled={saving} onChange={e => setEnabled(e.target.checked)} />見学・体験・利用の申込みをフォームで受け付ける</label><button disabled={saving} onClick={() => void save()} className="mt-5 min-h-12 w-full rounded-full bg-rose-600 px-5 text-sm font-bold text-white disabled:opacity-40">{saving ? '保存しています…' : '空き情報・受付設定を保存'}</button>{notice && <p role="status" className="mt-3 text-sm leading-6 text-emerald-700">{notice}</p>}</section>
        <section className="rounded-3xl border border-slate-100 bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-bold"><Inbox className="h-5 w-5 text-rose-500" />届いたお申込み</h2><span className="text-sm text-slate-500">{data.total}件</span></div><p className="mt-3 text-xs leading-6 text-slate-500">内容を確認し、申込者へ電話やメールでご連絡ください。送信時に担当者のCares通知にも届きます。</p>{data.applications.length ? <ul className="mt-4 divide-y divide-slate-100">{data.applications.map(item => <li key={item.id}><Link href={`/manage/applications/${item.id}`} className="block rounded-xl py-5 hover:bg-rose-50/50"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">{REQUEST_TYPES[item.request_type]}</span><span className={`rounded-full px-3 py-1 text-xs ${item.status === 'new' ? 'bg-amber-50 font-bold text-amber-800' : 'bg-slate-50 text-slate-500'}`}>{INTAKE_STATUSES[item.status]}</span></div><p className="mt-3 break-words font-bold">{item.client_name} 様</p><p className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p></Link></li>)}</ul> : <div className="py-12 text-center"><Inbox className="mx-auto h-9 w-9 text-rose-200" /><p className="mt-4 text-sm text-slate-500">お申込みが届くと、ここに表示されます。</p><Link href={`/directory/${data.target.id}/apply`} className="mt-4 inline-block text-sm font-semibold text-rose-700 underline">申込みフォームを確認する</Link></div>}
        {data.total > 25 && <div className="mt-4 flex items-center justify-between text-sm"><button disabled={page === 0} onClick={() => setPage(value => value - 1)} className="min-h-11 px-3 disabled:opacity-30">← 前へ</button><span>{page + 1} / {Math.ceil(data.total / 25)}</span><button disabled={(page + 1) * 25 >= data.total} onClick={() => setPage(value => value + 1)} className="min-h-11 px-3 disabled:opacity-30">次へ →</button></div>}
        <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-6 text-slate-400">申込内容・原本は180日経過後に削除されます。必要な情報は事業所の管理ルールに沿って保存してください。</p></section>
      </div>
    </>}
  </main>
}
