'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Copy, Printer } from 'lucide-react'
export default function ListShareTools({ token, printable = false }: { token: string; printable?: boolean }) {
  const url = `https://cares.carespace.jp/shortlists/${token}`
  const [qr, setQr] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState(''), [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setQr(''); setError('')
    import('qrcode').then(module => module.toDataURL(url, { width: 480, margin: 3, errorCorrectionLevel: 'M', color: { dark: '#334155', light: '#ffffff' } }))
      .then(image => { if (active) setQr(image) }).catch(() => { if (active) setError('QRコードを作成できませんでした。') })
    return () => { active = false }
  }, [url, retry])
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage('URLをコピーしました。') }
    catch { setMessage('下のURLを選択してコピーしてください。') }
  }
  return <section aria-label="候補リストの共有" className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 print:border-0 print:p-0">
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      {qr && <Image unoptimized src={qr} width={144} height={144} alt="候補リストを開くQRコード" className="h-36 w-36 shrink-0" />}
      <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-800">この候補リストをスマホで見る</p><p className="mt-1 text-xs text-slate-500">リンクを知っている方が、登録なしで閲覧できます。</p>
        <div className="mt-3 flex flex-wrap gap-2 print:hidden"><button onClick={copy} className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold"><Copy className="h-4 w-4" />URLをコピー</button>{printable ? <button disabled={!qr} onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold disabled:opacity-40"><Printer className="h-4 w-4" />印刷する</button> : <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold">共有ページ・印刷</a>}</div>
        <label className="mt-2 block text-xs text-slate-500 print:hidden">共有URL<input readOnly value={url} onFocus={e => e.target.select()} className="mt-1 min-h-11 w-full rounded-lg border bg-slate-50 px-2 text-xs" /></label>
        {message && <p role="status" className="mt-2 text-xs text-emerald-700 print:hidden">{message}</p>}
        {error && <p role="alert" className="text-sm text-rose-700 print:hidden">{error}<button onClick={() => setRetry(value => value + 1)} className="min-h-11 px-2 underline">再試行</button></p>}
      </div>
    </div>
  </section>
}
