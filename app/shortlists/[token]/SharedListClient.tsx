'use client'
import { useEffect, useState } from 'react'
import { listRequest, ListRequestError } from '@/lib/personal-lists-client'
import SharedListContent, { type SharedListData } from '@/components/SharedListContent'
import ListShareTools from '@/components/ListShareTools'

export default function SharedListClient({ token }: { token: string }) {
  const [data, setData] = useState<SharedListData | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0), [missing, setMissing] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    setData(null); setError(''); setMissing(false)
    listRequest<SharedListData>(`/api/shared-lists/${token}`, undefined, 'GET', controller.signal).then(data => { if (!controller.signal.aborted) setData(data) })
      .catch(error => { if (!controller.signal.aborted) { setError(error.message); setMissing(error instanceof ListRequestError && error.status === 404) } })
    return () => controller.abort()
  }, [token, retry])
  return <div className="shared-list-page mx-auto max-w-4xl px-4 py-8 sm:px-6">
    <style>{`@media print { @page { size: A4; margin: 14mm; } body { background: white !important; } body > header, body > footer { display: none !important; } main { min-height: 0 !important; } .shared-list-page { max-width: none; padding: 0; } .shared-list-content > div { grid-template-columns: 1fr 1fr; gap: 12px; } .shared-list-content article { break-inside: avoid; } }`}</style>
    <p className="mb-3 text-xs font-semibold tracking-widest text-slate-500">CARES · 事業所のご紹介</p>
    {data ? <><SharedListContent data={data} /><ListShareTools token={token} printable /></> : error ? <div className="rounded-2xl border bg-white p-6"><h1 className="text-lg font-bold">{missing ? 'このリストは現在閲覧できません' : 'リストを読み込めませんでした'}</h1><p role="alert" className="mt-3 text-sm text-slate-600">{error}</p>{!missing && <button onClick={() => setRetry(value => value + 1)} className="mt-3 min-h-11 text-sm underline">再読み込み</button>}</div> : <p role="status" className="text-sm text-slate-500">候補リストを読み込み中…</p>}
  </div>
}
