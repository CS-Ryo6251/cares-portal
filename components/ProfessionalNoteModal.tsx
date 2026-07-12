'use client'

import { useState } from 'react'
import { X, MessageSquareText, Stethoscope } from 'lucide-react'

const REPORTER_TYPES = [
  { value: 'family', label: 'ご家族・利用検討者', group: 'review' },
  { value: 'community', label: '地域の方・関係者', group: 'review' },
  { value: 'care_manager', label: 'ケアマネジャー', group: 'professional' },
  { value: 'msw', label: 'MSW（医療ソーシャルワーカー）', group: 'professional' },
  { value: 'nurse', label: '看護師', group: 'professional' },
  { value: 'therapist', label: 'リハビリ職（PT/OT/ST）', group: 'professional' },
  { value: 'counselor', label: '相談員', group: 'professional' },
  { value: 'doctor', label: '医師', group: 'professional' },
  { value: 'other', label: 'その他の専門職', group: 'professional' },
]

function getPostKind(reporterType: string) {
  return REPORTER_TYPES.find((type) => type.value === reporterType)?.group === 'professional'
    ? 'professional'
    : 'review'
}

type ProfessionalNoteModalProps = {
  listingId: string
  onClose: () => void
  onSubmitted?: () => void
}

export default function ProfessionalNoteModal({
  listingId,
  onClose,
  onSubmitted,
}: ProfessionalNoteModalProps) {
  const [reporterType, setReporterType] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!reporterType || !content.trim()) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/directory/${listingId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter_type: reporterType,
          content: content.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '投稿に失敗しました')
        return
      }

      setSuccess(true)
      onSubmitted?.()
      setTimeout(onClose, 1500)
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  const postKind = getPostKind(reporterType)
  const isProfessional = postKind === 'professional'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md mx-0 sm:mx-4 p-6 animate-slide-in-right">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-gray-900 mb-2">投稿する</h3>
        <p className="text-sm text-gray-500 mb-4">
          所属事業所は表示せず、立場だけを添えて公開します。
        </p>

        {success ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-900">投稿しました</p>
          </div>
        ) : (
          <>
            {/* Reporter type selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                投稿者の立場 <span className="text-red-500">*</span>
              </label>
              <select
                value={reporterType}
                onChange={(e) => setReporterType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none bg-white"
              >
                <option value="">選択してください</option>
                <optgroup label="口コミ">
                  {REPORTER_TYPES.filter((type) => type.group === 'review').map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="専門職メモ">
                  {REPORTER_TYPES.filter((type) => type.group === 'professional').map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className={`mb-4 rounded-xl border p-3 ${
              isProfessional
                ? 'border-sky-100 bg-sky-50 text-sky-900'
                : 'border-amber-100 bg-amber-50 text-amber-900'
            }`}>
              <div className="flex items-start gap-2">
                {isProfessional ? <Stethoscope className="mt-0.5 h-4 w-4" /> : <MessageSquareText className="mt-0.5 h-4 w-4" />}
                <div>
                  <p className="text-sm font-bold">{isProfessional ? '専門職メモとして表示' : '口コミとして表示'}</p>
                  <p className="mt-1 text-xs leading-5 opacity-80">
                    {isProfessional
                      ? 'ケアマネや医療・介護職が見た、受け入れ相談や連携時の実務的な情報です。'
                      : 'ご家族や地域の方が感じた、雰囲気や対応のわかりやすい感想です。'}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isProfessional ? '専門職メモ' : '口コミ'} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={isProfessional
                  ? '例: 退院調整時の連絡が早い、受け入れ条件の説明が明確、リハビリ体制が確認しやすい、など'
                  : '例: 見学時の雰囲気がよかった、料金説明がわかりやすかった、職員さんの対応が丁寧だった、など'}
                maxLength={500}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {content.length}/500
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 mb-3">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!reporterType || !content.trim() || submitting}
              className="w-full px-4 py-3 bg-cares-600 text-white rounded-xl text-base font-semibold hover:bg-cares-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? '送信中...' : '投稿する'}
            </button>

            <p className="text-xs text-gray-400 mt-3 text-center">
              匿名で公開されます。施設選びや連携判断に役立つ具体的な情報の共有にご協力ください。
            </p>
          </>
        )}
      </div>
    </div>
  )
}
