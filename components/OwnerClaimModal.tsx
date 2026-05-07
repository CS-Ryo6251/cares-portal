'use client'

import { useState } from 'react'
import { X, ExternalLink, Shield, BarChart3, Bell } from 'lucide-react'

type OwnerClaimModalProps = {
  listingId: string
  facilityName: string
  jigyoshoNumber?: string | null
  onClose: () => void
}

export default function OwnerClaimModal({
  listingId,
  facilityName,
  jigyoshoNumber,
  onClose,
}: OwnerClaimModalProps) {
  const [claimerName, setClaimerName] = useState('')
  const [claimerEmail, setClaimerEmail] = useState('')
  const [claimerPhone, setClaimerPhone] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!claimerName.trim() || !claimerEmail.trim()) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/directory/${listingId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimer_name: claimerName,
          claimer_email: claimerEmail,
          claimer_phone: claimerPhone,
          organization_name: organizationName,
          jigyosho_number: jigyoshoNumber,
          message,
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

        <h3 className="text-lg font-bold text-gray-900 mb-1">公式管理を申請する</h3>
        <p className="text-sm text-gray-500 mb-1">{facilityName}</p>
        {jigyoshoNumber && (
          <p className="text-xs text-gray-400 mb-4">事業所番号: {jigyoshoNumber}</p>
        )}

        <div className="bg-cares-50 rounded-xl p-4 mb-5">
          <p className="text-sm text-cares-700 leading-relaxed">
            申請内容を確認後、担当者よりご連絡します。商談・オンボーディング時にCareSpaceの経営支援「Cares管理」での連携方法をご案内します。
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {[
            { icon: Shield, text: '公表データのページに「公式」バッジを表示' },
            { icon: BarChart3, text: '基本情報・空き状況・料金表を直接更新' },
            { icon: Bell, text: '口コミ・問い合わせ・投稿を一元管理' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-gray-500" />
              </div>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {success ? (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
            <p className="text-sm font-bold text-green-800">申請を受け付けました</p>
            <p className="mt-1 text-xs leading-relaxed text-green-700">
              担当者より確認のご連絡をいたします。
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800 transition-colors"
            >
              閉じる
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">お名前 *</label>
                <input
                  value={claimerName}
                  onChange={(e) => setClaimerName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-cares-500 focus:ring-2 focus:ring-cares-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">メールアドレス *</label>
                <input
                  type="email"
                  value={claimerEmail}
                  onChange={(e) => setClaimerEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-cares-500 focus:ring-2 focus:ring-cares-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">電話番号</label>
                <input
                  value={claimerPhone}
                  onChange={(e) => setClaimerPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-cares-500 focus:ring-2 focus:ring-cares-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">法人名・事業所名</label>
                <input
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder={facilityName}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-cares-500 focus:ring-2 focus:ring-cares-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">相談したい内容</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="料金表を掲載したい、空き状況を発信したい、など"
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-cares-500 focus:ring-2 focus:ring-cares-100"
                />
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!claimerName.trim() || !claimerEmail.trim() || submitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cares-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-cares-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? '送信中...' : '公式管理を申請する'}
              <ExternalLink className="w-4 h-4" />
            </button>

            <p className="mt-3 text-center text-xs text-gray-400">
              申請後、担当者よりCareSpace連携の流れをご案内します。
            </p>
          </>
        )}
      </div>
    </div>
  )
}
