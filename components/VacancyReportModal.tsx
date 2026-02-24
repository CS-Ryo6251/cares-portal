'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

type VacancyReportModalProps = {
  listingId: string
  onClose: () => void
}

export default function VacancyReportModal({ listingId, onClose }: VacancyReportModalProps) {
  const [vacancyType, setVacancyType] = useState<string>('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!vacancyType) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/directory/${listingId}/vacancy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vacancy_type: vacancyType,
          comment: comment.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '投稿に失敗しました')
        return
      }

      setSuccess(true)
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

        <h3 className="text-lg font-bold text-gray-900 mb-4">空き情報を投稿する</h3>

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
            <div className="space-y-3 mb-4">
              {[
                { value: 'has_vacancy', label: '空きあり', color: 'border-green-300 bg-green-50' },
                { value: 'no_vacancy', label: '空きなし', color: 'border-red-300 bg-red-50' },
                { value: 'unknown', label: 'わからない', color: 'border-gray-300 bg-gray-50' },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-colors ${
                    vacancyType === option.value
                      ? option.color
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="vacancy"
                    value={option.value}
                    checked={vacancyType === option.value}
                    onChange={(e) => setVacancyType(e.target.value)}
                    className="accent-cares-600"
                  />
                  <span className="text-base font-medium text-gray-900">{option.label}</span>
                </label>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="コメント（任意・200文字以内）"
              maxLength={200}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none resize-none mb-4"
            />

            {error && (
              <p className="text-sm text-red-600 mb-3">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!vacancyType || submitting}
              className="w-full px-4 py-3 bg-cares-600 text-white rounded-xl text-base font-semibold hover:bg-cares-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? '送信中...' : '投稿する'}
            </button>

            <p className="text-xs text-gray-400 mt-3 text-center">
              この情報はコミュニティ投稿として匿名で公開されます
            </p>
          </>
        )}
      </div>
    </div>
  )
}
