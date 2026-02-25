'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

type PersonalNoteModalProps = {
  listingId: string
  initialContent?: string
  onClose: () => void
  onSubmitted?: () => void
}

export default function PersonalNoteModal({
  listingId,
  initialContent = '',
  onClose,
  onSubmitted,
}: PersonalNoteModalProps) {
  const [content, setContent] = useState(initialContent)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!content.trim()) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/directory/${listingId}/personal-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '保存に失敗しました')
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

        <h3 className="text-lg font-bold text-gray-900 mb-4">個人メモを編集</h3>

        {success ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-900">保存しました</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="この施設について個人的なメモを残せます（例: 対応が丁寧、家族の希望に合いそう、など）"
                maxLength={1000}
                rows={5}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {content.length}/1000
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 mb-3">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="w-full px-4 py-3 bg-cares-600 text-white rounded-xl text-base font-semibold hover:bg-cares-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? '保存中...' : '保存する'}
            </button>

            <p className="text-xs text-gray-400 mt-3 text-center">
              このメモはあなただけに表示されます
            </p>
          </>
        )}
      </div>
    </div>
  )
}
