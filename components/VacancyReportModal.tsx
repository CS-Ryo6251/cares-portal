'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X } from 'lucide-react'
import { japanDate, VACANCY_SOURCES, validateVacancy } from '@/lib/community'

type Props = { listingId: string; onClose: () => void }

export default function VacancyReportModal({ listingId, onClose }: Props) {
  const router = useRouter()
  const [vacancyType, setVacancyType] = useState('')
  const [source, setSource] = useState('')
  const [confirmedOn, setConfirmedOn] = useState(japanDate())
  const [validUntil, setValidUntil] = useState(japanDate(new Date(Date.now() + 7 * 86400000)))
  const [comment, setComment] = useState('')
  const [publicationConfirmed, setPublicationConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [loginNeeded, setLoginNeeded] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    const body = { vacancy_type: vacancyType, information_source: source, confirmed_on: confirmedOn,
      valid_until: validUntil, comment: comment.trim(), publication_confirmed: publicationConfirmed }
    const validation = validateVacancy(body)
    if (validation) { setError(validation); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/directory/${listingId}/vacancy`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setLoginNeeded(res.status === 401); setError(data.error || '掲載に失敗しました'); return }
      setSuccess(true)
      router.refresh()
    } catch { setError('送信結果を確認できませんでした。画面を更新して掲載内容をご確認ください。') }
    finally { setSubmitting(false) }
  }

  const inputClass = 'mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base'
  return <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
    <div className="absolute inset-0 bg-black/40" onClick={submitting ? undefined : onClose} />
    <section role="dialog" aria-modal="true" aria-labelledby="vacancy-title" className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 sm:mx-4 sm:max-w-lg sm:rounded-2xl">
      <button disabled={submitting} onClick={onClose} aria-label="閉じる" className="absolute right-4 top-4 p-2"><X className="h-5 w-5" /></button>
      <h3 id="vacancy-title" className="pr-8 text-lg font-bold">届いた空き情報を掲載する</h3>
      {success ? <div className="py-6"><p role="status">掲載しました。情報提供ありがとうございます。</p><button onClick={onClose} className="mt-4 text-cares-700 underline">掲載内容を見る</button></div> :
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm leading-6 text-gray-600">事業所から届いた情報や、直接確認した状況を共有できます。ログインが必要です。</p>
          <label className="block text-sm font-medium">空き状況<select required value={vacancyType} onChange={e => setVacancyType(e.target.value)} className={inputClass}>
            <option value="">選択してください</option><option value="has_vacancy">空きあり</option><option value="no_vacancy">空きなし</option><option value="unknown">要確認</option>
          </select></label>
          <label className="block text-sm font-medium">情報源<select required value={source} onChange={e => setSource(e.target.value)} className={inputClass}>
            <option value="">選択してください</option>{Object.entries(VACANCY_SOURCES).map(([value,label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">確認日<input type="date" required max={japanDate()} value={confirmedOn} onChange={e => setConfirmedOn(e.target.value)} className={inputClass} /></label>
            <label className="block text-sm font-medium">掲載期限<input type="date" required min={japanDate()} value={validUntil} onChange={e => setValidUntil(e.target.value)} className={inputClass} /></label>
          </div>
          <p className="text-xs text-gray-600">掲載期限は確認日から30日以内。期限を過ぎると「要確認」として扱います。</p>
          <label className="block text-sm font-medium">曜日・人数・受入条件（任意）<textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={200} rows={3} placeholder="例：火・木に各1名。送迎範囲は事業所へご相談ください。" className={inputClass} /></label>
          <label className="flex items-start gap-2 text-sm leading-6"><input type="checkbox" required checked={publicationConfirmed} onChange={e => setPublicationConfirmed(e.target.checked)} className="mt-1.5" />公開してよい事業所情報であり、利用者の個人情報を含めていないことを確認しました。</label>
          <p className="text-xs text-gray-500">情報源・確認日・受入条件が公開されます。情報源は投稿者の申告で、Caresによる確認済み表示ではありません。</p>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {loginNeeded && <Link className="block text-cares-700 underline" href={`/login?redirect=${encodeURIComponent(`/directory/${listingId}`)}`}>ログインする（入力内容は移動前に控えてください）</Link>}
          <button disabled={submitting} className="w-full rounded-xl bg-cares-600 py-3 font-bold text-white disabled:opacity-50">{submitting ? '掲載中…' : '空き情報を掲載する'}</button>
        </form>}
    </section>
  </div>
}
