'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

const REPORTER_TYPES = [
  { value: 'care_manager', label: 'ケアマネジャー' },
  { value: 'msw', label: 'MSW（医療ソーシャルワーカー）' },
  { value: 'nurse', label: '看護師' },
  { value: 'therapist', label: 'リハビリ職（PT/OT/ST）' },
  { value: 'counselor', label: '相談員' },
  { value: 'doctor', label: '医師' },
  { value: 'other', label: 'その他の専門職' },
]

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

        <h3 className="text-lg font-bold text-gray-900 mb-4">専門職メモを投稿する</h3>

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
                あなたの職種 <span className="text-red-500">*</span>
              </label>
              <select
                value={reporterType}
                onChange={(e) => setReporterType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none bg-white"
              >
                <option value="">選択してください</option>
                {REPORTER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Content */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メモ内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="施設選びに役立つ情報を共有してください（例: リハビリに力を入れている、受け入れ対応が早い、など）"
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
              匿名で公開されます。施設選びに役立つ事実情報の共有にご協力ください。
            </p>
          </>
        )}
      </div>
    </div>
  )
}
