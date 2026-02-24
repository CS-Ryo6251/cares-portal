'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

type OwnerClaimModalProps = {
  listingId: string
  facilityName: string
  onClose: () => void
}

export default function OwnerClaimModal({ listingId, facilityName, onClose }: OwnerClaimModalProps) {
  const [form, setForm] = useState({
    claimer_name: '',
    claimer_email: '',
    claimer_phone: '',
    organization_name: '',
    jigyosho_number: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    if (!form.claimer_name.trim() || !form.claimer_email.trim()) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/directory/${listingId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimer_name: form.claimer_name.trim(),
          claimer_email: form.claimer_email.trim(),
          claimer_phone: form.claimer_phone.trim() || undefined,
          organization_name: form.organization_name.trim() || undefined,
          jigyosho_number: form.jigyosho_number.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '申請に失敗しました')
        return
      }

      setSuccess(true)
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

        <h3 className="text-lg font-bold text-gray-900 mb-1">オーナー登録を申請する</h3>
        <p className="text-sm text-gray-500 mb-4">{facilityName}</p>

        {success ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-900">申請を受け付けました</p>
            <p className="text-sm text-gray-500 mt-1">確認後にご連絡いたします</p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-cares-600 text-white rounded-xl text-sm font-medium hover:bg-cares-700 transition-colors"
            >
              閉じる
            </button>
          </div>
        ) : (
          <>
            <div className="bg-cares-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-cares-700 leading-relaxed">
                オーナー登録すると、CareSpace OSを使って公式情報を管理できます。施設ページに「公式」バッジが表示され、情報の信頼性が向上します。
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  お名前 *
                </label>
                <input
                  type="text"
                  value={form.claimer_name}
                  onChange={(e) => updateField('claimer_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス *
                </label>
                <input
                  type="email"
                  value={form.claimer_email}
                  onChange={(e) => updateField('claimer_email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  電話番号
                </label>
                <input
                  type="tel"
                  value={form.claimer_phone}
                  onChange={(e) => updateField('claimer_phone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  法人名
                </label>
                <input
                  type="text"
                  value={form.organization_name}
                  onChange={(e) => updateField('organization_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  事業所番号
                </label>
                <input
                  type="text"
                  value={form.jigyosho_number}
                  onChange={(e) => updateField('jigyosho_number', e.target.value)}
                  placeholder="10桁の数字"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 mt-3">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!form.claimer_name.trim() || !form.claimer_email.trim() || submitting}
              className="w-full mt-4 px-4 py-3 bg-cares-600 text-white rounded-xl text-base font-semibold hover:bg-cares-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? '送信中...' : 'オーナー登録を申請する'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
