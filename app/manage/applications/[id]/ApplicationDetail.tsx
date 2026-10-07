'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { FIELD_LABELS, IntakeFields, INTAKE_STATUSES, REQUEST_TYPES } from '@/lib/intake'

type Detail = { application: { id: string; listing_id: string; fields: IntakeFields; status: keyof typeof INTAKE_STATUSES; version: number; created_at: string }; files: { id: string; mime_type: string; size_bytes: number }[] }
export default function ApplicationDetail({ id }: { id: string }) {
  const [data, setData] = useState<Detail | null>(null); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [refresh, setRefresh] = useState(0); const [busy, setBusy] = useState(false)
  useEffect(() => { const controller = new AbortController(); setData(null); setError('')
    fetch(`/api/intake/manage/${id}`, { cache: 'no-store', signal: controller.signal }).then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error); if (!controller.signal.aborted) setData(body) }).catch(e => { if (!controller.signal.aborted) setError(e.message || '読み込めませんでした。') })
    return () => controller.abort()
  }, [id, refresh])
  async function updateStatus(status: string) {
    if (!data || busy) return
    setBusy(true); setError(''); setNotice('')
    try { const response = await fetch('/api/intake/manage', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status', id, version: data.application.version, status }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setData({ ...data, application: { ...data.application, status: status as keyof typeof INTAKE_STATUSES, version: body.version } }); setNotice('受付状況を更新しました。') }
    catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  function exportCsv() {
    if (!data) return
    const cell = (value: string) => `"${(/^[\s]*[=+@\-\t\r\n]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`
    const rows = Object.entries(FIELD_LABELS).map(([key, label]) => [label, key === 'request_type' ? REQUEST_TYPES[data.application.fields.request_type as keyof typeof REQUEST_TYPES] : data.application.fields[key as keyof IntakeFields]])
    const csv = '\uFEFF' + [['受付番号', id], ['受付日', data.application.created_at], ...rows].map(row => row.map(cell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'cares-application.csv'; a.click(); URL.revokeObjectURL(url)
  }
  return <main className="mx-auto max-w-3xl px-4 py-8"><Link href="/manage" className="text-sm font-semibold text-slate-500">← 申込み受付に戻る</Link><h1 className="mt-6 text-2xl font-bold">お申込みの確認</h1>{error && <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}<button className="ml-3 min-h-11 underline" onClick={() => setRefresh(value => value + 1)}>再読み込み</button></div>}{!data && !error && <p role="status" className="py-10 text-slate-500">読み込んでいます…</p>}{data && <>
    <section className="mt-6 rounded-3xl border border-rose-100 bg-white p-5 sm:p-7"><p className="text-xs text-slate-500">受付 {new Date(data.application.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p><label className="mt-5 block text-sm font-bold">受付状況<select className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-base" disabled={busy} value={data.application.status} onChange={e => void updateStatus(e.target.value)}>{Object.entries(INTAKE_STATUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{notice && <p role="status" className="mt-3 text-sm text-emerald-700">{notice}</p>}<p className="mt-4 text-xs leading-6 text-slate-500">受付状況の変更だけでは申込者への連絡は送信されません。電話やメールでご連絡ください。</p>
    <dl className="mt-5 divide-y divide-slate-100">{Object.entries(FIELD_LABELS).map(([key, label]) => <div key={key} className="py-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-7">{key === 'request_type' ? REQUEST_TYPES[data.application.fields.request_type as keyof typeof REQUEST_TYPES] : data.application.fields[key as keyof IntakeFields] || '未入力'}</dd></div>)}</dl>
    <div className="mt-4 flex flex-wrap gap-3">{data.application.fields.phone && <a href={`tel:${data.application.fields.phone.replace(/[^+\d]/g, '')}`} className="inline-flex min-h-12 items-center rounded-full bg-rose-600 px-5 text-sm font-bold text-white">申込者に電話する</a>}{data.application.fields.email && <a href={`mailto:${encodeURIComponent(data.application.fields.email)}`} className="inline-flex min-h-12 items-center rounded-full border border-slate-200 px-5 text-sm font-bold">メールを作成</a>}<button onClick={exportCsv} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-slate-200 px-5 text-sm font-bold"><Download className="h-4 w-4" />CSVで保存</button></div></section>
    <section className="mt-5 rounded-3xl border border-slate-100 bg-white p-6"><h2 className="font-bold">添付された原本</h2>{data.files.length ? data.files.map((file, i) => <a key={file.id} href={`/api/intake/manage/${id}?file=${file.id}`} className="mt-3 flex min-h-12 items-center gap-2 rounded-xl bg-stone-50 p-4 text-sm font-semibold"><FileText className="h-4 w-4" />書類{i + 1}（{file.mime_type === 'application/pdf' ? 'PDF' : '画像'}・{Math.ceil(file.size_bytes / 1024)}KB）<Download className="ml-auto h-4 w-4" /></a>) : <p className="mt-3 text-sm text-slate-500">添付はありません。</p>}<p className="mt-5 text-xs leading-6 text-slate-500">申込内容は申込者が確認して送信したものです。必要に応じて原本や本人への確認を行ってください。利用者台帳への自動登録は行いません。</p></section>
    <p className="my-5 text-xs leading-6 text-slate-500">申込内容・添付は180日経過後に削除されます。ダウンロードしたデータも事業所の管理ルールに沿ってお取り扱いください。</p>
    </>}</main>
}
