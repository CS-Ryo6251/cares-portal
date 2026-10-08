'use client'
import { useState, type FormEvent } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { BROCHURE_MAX_BYTES, BROCHURE_MAX_FILES, type Brochure } from '@/lib/brochures'

// Rasterize photos before public upload to remove camera/location metadata and reduce size.
async function preparePhoto(file: File): Promise<File> {
  if (file.type === 'application/pdf') return file
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('写真はJPEG・PNG・WebPを選んでください。')
  if (file.size > 20 * 1024 * 1024) throw new Error('写真は1枚20MB以内で選んでください。')
  const url = URL.createObjectURL(file)
  try {
    const photo = new Image()
    photo.src = url
    await photo.decode()
    const scale = Math.min(1, 2000 / Math.max(photo.naturalWidth, photo.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('写真を読み込めませんでした。')
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(photo, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('写真を読み込めませんでした。')), 'image/jpeg', .88))
    return new File([blob], 'photo.jpg', { type: 'image/jpeg' })
  } finally { URL.revokeObjectURL(url) }
}

export default function BrochureForm({ listingId, initial, onDone, onCancel }: { listingId: string; initial?: Brochure; onDone: (id: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(initial?.title || ''), [note, setNote] = useState(initial?.note || ''), [issuedMonth, setIssuedMonth] = useState(initial?.issuedMonth || '')
  const [files, setFiles] = useState<File[]>([]), [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [preparing, setPreparing] = useState(false), [error, setError] = useState('')
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      let response: Response
      if (initial) {
        response = await fetch(`/api/brochures/${initial.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'edit', title, note, issuedMonth }) })
      } else {
        const form = new FormData()
        for (const [key, value] of Object.entries({ id: requestId, listing: listingId, title, note, issuedMonth, consent: String(consent) })) form.set(key, value)
        files.forEach(file => form.append('files', file))
        response = await fetch('/api/brochures', { method: 'POST', body: form })
      }
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '共有できませんでした。')
      onDone(initial?.id || result.id)
    } catch (reason) { setError(reason instanceof Error ? reason.message : '通信に失敗しました。同じ内容のまま再試行できます。') }
    finally { setBusy(false) }
  }
  const input = 'mt-1 block min-h-11 w-full min-w-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-normal text-slate-800'
  return <form onSubmit={submit} className="mt-4 space-y-4 rounded-2xl border border-[#dce4d9] bg-[#f6f8f3] p-4 sm:p-5">
    <h3 className="font-bold text-slate-900">{initial ? '資料の情報を編集' : 'パンフレットを共有'}</h3>
    <fieldset disabled={busy || preparing} className="min-w-0 space-y-4 disabled:opacity-70">
      <label className="block text-sm font-semibold">タイトル<input required maxLength={100} className={input} value={title} onChange={event => { setTitle(event.target.value); setRequestId(crypto.randomUUID()) }} placeholder="例：事業所案内 2026年版" /></label>
      <label className="block text-sm font-semibold">発行年月 <span className="font-normal text-slate-500">不明なら空欄</span><input type="month" className={input} value={issuedMonth} onChange={event => { setIssuedMonth(event.target.value); setRequestId(crypto.randomUUID()) }} /></label>
      <label className="block text-sm font-semibold">補足 <span className="font-normal text-slate-500">任意</span><textarea className={input} rows={2} maxLength={300} value={note} onChange={event => { setNote(event.target.value); setRequestId(crypto.randomUUID()) }} placeholder="例：見学時に配布されていた資料です" /></label>
      {!initial && <>
        <label className="block text-sm font-semibold">PDF・写真<input required type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="mt-2 block w-full min-w-0 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-3 file:text-sm file:font-semibold" onChange={async event => {
          const selected = Array.from(event.target.files || []); setError(''); setFiles([]); setRequestId(crypto.randomUUID())
          if (!selected.length) return
          if (selected.length > BROCHURE_MAX_FILES) { setError('ファイルは3件まで選んでください。'); event.target.value = ''; return }
          setPreparing(true)
          try {
            const prepared = await Promise.all(selected.map(preparePhoto))
            if (prepared.reduce((sum, file) => sum + file.size, 0) > BROCHURE_MAX_BYTES) throw new Error('合計3MB以内にしてください。PDFは圧縮して再度選んでください。')
            setFiles(prepared)
          } catch (reason) { setError(reason instanceof Error ? reason.message : 'ファイルを読み込めませんでした。') }
          finally { setPreparing(false) }
        }} /></label>
        <p className="text-xs leading-6 text-slate-500">3件・合計3MBまで。写真はアップロード前に軽量化します。</p>
        <label className="flex items-start gap-2 text-sm leading-6"><input required type="checkbox" className="mt-1.5 h-4 w-4 shrink-0 accent-[#526b58]" checked={consent} onChange={event => setConsent(event.target.checked)} />一般公開してよい事業所資料であり、利用者の個人情報や非公開情報が含まれていないことを確認しました。</label>
      </>}
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-2"><button disabled={busy || preparing || (!initial && (!files.length || !consent))} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#526b58] px-4 text-sm font-bold text-white disabled:opacity-50">{busy || preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{preparing ? '写真を準備中' : busy ? '保存中' : initial ? '変更を保存' : '公開して共有する'}</button><button type="button" disabled={busy || preparing} onClick={onCancel} className="min-h-11 rounded-xl px-4 text-sm text-slate-600">キャンセル</button></div>
  </form>
}
