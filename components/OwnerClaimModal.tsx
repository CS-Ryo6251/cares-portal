'use client'

import { X, ExternalLink, Shield, BarChart3, Bell } from 'lucide-react'

type OwnerClaimModalProps = {
  listingId: string
  facilityName: string
  onClose: () => void
}

export default function OwnerClaimModal({ listingId, facilityName, onClose }: OwnerClaimModalProps) {
  const carespaceSignupUrl = `https://app.carespace.jp/signup?source=cares&facility_ref=${encodeURIComponent(listingId)}`

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

        <h3 className="text-lg font-bold text-gray-900 mb-1">施設情報を管理する</h3>
        <p className="text-sm text-gray-500 mb-4">{facilityName}</p>

        <div className="bg-cares-50 rounded-xl p-4 mb-5">
          <p className="text-sm text-cares-700 leading-relaxed">
            CareSpace OS（無料）に登録すると、この施設の公式情報を管理できます。
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {[
            { icon: Shield, text: '施設ページに「公式」バッジを表示' },
            { icon: BarChart3, text: '空き状況・料金を直接更新' },
            { icon: Bell, text: '問い合わせ・専門職メモを一元管理' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-gray-500" />
              </div>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <a
          href={carespaceSignupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-cares-600 text-white rounded-xl text-base font-semibold hover:bg-cares-700 transition-colors"
        >
          CareSpace OS に登録する（無料）
          <ExternalLink className="w-4 h-4" />
        </a>

        <p className="mt-3 text-center text-xs text-gray-400">
          app.carespace.jp に遷移します
        </p>
      </div>
    </div>
  )
}
