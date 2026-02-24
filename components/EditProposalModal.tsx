'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

const editableFields = [
  { value: 'facility_name', label: '事業所名' },
  { value: 'address', label: '住所' },
  { value: 'phone', label: '電話番号' },
  { value: 'fax', label: 'FAX' },
  { value: 'email', label: 'メールアドレス' },
  { value: 'website_url', label: 'ウェブサイト' },
  { value: 'service_type', label: 'サービス種別' },
  { value: 'capacity', label: '定員' },
  { value: 'corporation_name', label: '運営法人名' },
]

type EditProposalModalProps = {
  listingId: string
  currentValues: Record<string, string | null>
  onClose: () => void
}

export default function EditProposalModal({ listingId, currentValues, onClose }: EditProposalModalProps) {
  const [fieldName, setFieldName] = useState('')
  const [newValue, setNewValue] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const selectedField = editableFields.find((f) => f.value === fieldName)
  const oldValue = fieldName ? (currentValues[fieldName] || '') : ''

  async function handleSubmit() {
    if (!fieldName || !newValue.trim()) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/directory/${listingId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_name: fieldName,
          old_value: oldValue,
          new_value: newValue.trim(),
          reason: reason.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '送信に失敗しました')
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

        <h3 className="text-lg font-bold text-gray-900 mb-4">情報の修正を提案する</h3>

        {success ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-900">修正提案を送信しました</p>
            <p className="text-sm text-gray-500 mt-1">確認後に反映されます</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {/* Field selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  修正する項目
                </label>
                <select
                  value={fieldName}
                  onChange={(e) => {
                    setFieldName(e.target.value)
                    setNewValue('')
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none appearance-none cursor-pointer bg-white"
                >
                  <option value="">選択してください</option>
                  {editableFields.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current value (read-only) */}
              {fieldName && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1.5">
                    現在の値
                  </label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-600">
                    {oldValue || '(未設定)'}
                  </div>
                </div>
              )}

              {/* New value */}
              {fieldName && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    正しい値 *
                  </label>
                  <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder={`正しい${selectedField?.label || '値'}を入力`}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
                  />
                </div>
              )}

              {/* Reason */}
              {fieldName && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1.5">
                    理由（任意・500文字以内）
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={500}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none resize-none"
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 mt-3">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!fieldName || !newValue.trim() || submitting}
              className="w-full mt-4 px-4 py-3 bg-cares-600 text-white rounded-xl text-base font-semibold hover:bg-cares-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? '送信中...' : '修正を提案する'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
