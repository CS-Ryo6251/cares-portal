'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

type FeeInfoModalProps = {
  listingId: string
  onClose: () => void
  onSubmitted?: () => void
}

export default function FeeInfoModal({
  listingId,
  onClose,
  onSubmitted,
}: FeeInfoModalProps) {
  const [feeType, setFeeType] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!feeType) return
    if (!amountMin && !amountMax && !description.trim()) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/directory/${listingId}/fees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fee_type: feeType,
          amount_min: amountMin ? Number(amountMin) : null,
          amount_max: amountMax ? Number(amountMax) : null,
          description: description.trim() || undefined,
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
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md mx-0 sm:mx-4 p-6 max-h-[90vh] overflow-y-auto animate-slide-in-right">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-gray-900 mb-4">料金情報を追加する</h3>

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
            {/* Fee type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                料金種別 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={feeType}
                onChange={(e) => setFeeType(e.target.value)}
                placeholder="例: 入居一時金、月額費用、食費、管理費、など"
                maxLength={50}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
              />
            </div>

            {/* Amount range */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                金額（円）
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  placeholder="下限"
                  min={0}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
                />
                <span className="text-gray-400">〜</span>
                <input
                  type="number"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  placeholder="上限"
                  min={0}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                補足（任意）
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例: 一時金なしプランあり、食費込み、など"
                maxLength={200}
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 mb-3">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!feeType.trim() || (!amountMin && !amountMax && !description.trim()) || submitting}
              className="w-full px-4 py-3 bg-cares-600 text-white rounded-xl text-base font-semibold hover:bg-cares-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? '送信中...' : '投稿する'}
            </button>

            <p className="text-xs text-gray-400 mt-3 text-center">
              コミュニティ情報として匿名で公開されます
            </p>
          </>
        )}
      </div>
    </div>
  )
}
