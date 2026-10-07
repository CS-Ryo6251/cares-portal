'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Check, Copy, Download, ExternalLink, Loader2, Share2, X } from 'lucide-react'

interface Props {
  facilityName: string
  publicUrl: string
  postTitle?: string
  requestSupport?: boolean
  onClose: () => void
}

export default function FacilityShareDialog({ facilityName, publicUrl, postTitle, requestSupport = false, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const urlRef = useRef<HTMLInputElement>(null)
  const [qr, setQr] = useState('')
  const [qrError, setQrError] = useState(false)
  const [qrRetry, setQrRetry] = useState(0)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState('')
  const [canShare, setCanShare] = useState(false)
  const [sharing, setSharing] = useState(false)
  const title = postTitle ? `${postTitle}｜${facilityName}` : facilityName
  const messageText = postTitle ? `${facilityName}の「${postTitle}」。${requestSupport ? 'ハートで応援してもらえるとうれしいです。登録なしで応援できます。' : '日々のようすをご覧ください。'}` : `${facilityName}の事業所情報です。`

  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement
    dialog?.showModal()
    setCanShare(typeof navigator.share === 'function')
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    let active = true
    setQr('')
    setQrError(false)
    import('qrcode').then(module => module.toDataURL(publicUrl, {
      width: 640, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#111827', light: '#ffffff' },
    })).then(data => { if (active) setQr(data) }).catch(() => { if (active) setQrError(true) })
    return () => { active = false }
  }, [publicUrl, qrRetry])

  async function copyUrl() {
    setMessage('')
    setCopied(false)
    try {
      try { await navigator.clipboard.writeText(publicUrl) }
      catch {
        urlRef.current?.focus()
        urlRef.current?.select()
        if (!document.execCommand('copy')) throw new Error('Copy failed')
      }
      setCopied(true)
    } catch {
      setMessage('コピーできませんでした。下のURLを長押ししてコピーしてください。')
    }
  }

  async function sharePage() {
    setSharing(true)
    setMessage('')
    try {
      await navigator.share({ title: `${title}｜Cares`, text: messageText, url: publicUrl })
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setMessage('共有メニューを開けませんでした。URLのコピーや下の送信ボタンをご利用ください。')
    } finally { setSharing(false) }
  }

  const shareText = `${messageText}\n${publicUrl}`
  return <dialog ref={dialogRef} aria-labelledby="facility-share-title" onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }} className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-black/50">
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-5 py-3">
      <h2 id="facility-share-title" className="font-bold">{postTitle ? requestSupport ? '投稿を共有して応援を募る' : '投稿を共有する' : '事業所を見せる・共有する'}</h2>
      <button type="button" onClick={onClose} aria-label="共有画面を閉じる" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
    </div>
    <div className="space-y-5 p-5">
      <div className="text-center">
        <p className="break-words text-lg font-bold">{facilityName}</p>
        {postTitle && <p className="mt-2 break-words text-sm text-slate-700">{postTitle}</p>}
        <p className="mt-1 text-sm text-gray-500">相手のスマホで読み取ってもらえます</p>
        <div className="mx-auto mt-3 flex aspect-square w-full max-w-72 items-center justify-center rounded-2xl border border-gray-100 bg-white">
          {qr ? <Image src={qr} unoptimized alt={`${facilityName}の公開ページを開くQRコード`} width={288} height={288} className="h-auto w-full rounded-2xl" />
            : qrError ? <div role="alert" className="p-4 text-sm"><p>QRコードを表示できませんでした</p><button onClick={() => setQrRetry(value => value + 1)} className="mt-2 min-h-11 text-rose-700 underline">再読み込み</button></div>
            : <Loader2 aria-label="QRコードを作成中" className="h-7 w-7 animate-spin text-gray-400" />}
        </div>
        <p className="mt-2 text-xs text-gray-500">公開ページはログイン不要です</p>
      </div>
      <div className="grid gap-2">
        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-700"><ExternalLink className="h-4 w-4" />公開ページを見せる</a>
        {canShare && <button type="button" onClick={sharePage} disabled={sharing} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 disabled:opacity-50"><Share2 className="h-4 w-4" />{sharing ? '共有メニューを表示中...' : 'スマホの共有メニューを開く'}</button>}
        <button type="button" onClick={copyUrl} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'URLをコピーしました' : 'URLをコピー'}</button>
        <p role="status" aria-live="polite" className={message ? 'text-sm text-rose-700' : 'sr-only'}>{message || (copied ? 'URLをコピーしました' : '')}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <a href={`https://line.me/R/share?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center rounded-xl bg-green-50 px-2 text-sm font-semibold text-green-700">LINEで送る</a>
        <a href={`mailto:?subject=${encodeURIComponent(`${facilityName}のご案内`)}&body=${encodeURIComponent(shareText)}`} className="flex min-h-11 items-center justify-center rounded-xl bg-gray-50 px-2 text-sm font-semibold text-gray-700">メールで送る</a>
      </div>
      <div>
        <label htmlFor="facility-public-url" className="text-xs font-medium text-gray-500">{postTitle ? 'この投稿の公開URL' : 'この事業所の公開URL'}</label>
        <input ref={urlRef} id="facility-public-url" readOnly value={publicUrl} onFocus={event => event.target.select()} className="mt-1 w-full min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-600" />
      </div>
      {qr && <a href={qr} download={`cares-${publicUrl.split('/').pop()?.replace(/[^a-zA-Z0-9-]/g, '')}-qr.png`} className="flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-gray-600"><Download className="h-4 w-4" />QRコードを画像で保存</a>}
    </div>
  </dialog>
}
