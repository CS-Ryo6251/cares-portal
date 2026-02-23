'use client'

import { useState } from 'react'
import { Calculator, Mail, X } from 'lucide-react'
import FeeSimulator from './FeeSimulator'
import InquiryForm from './InquiryForm'

type Fee = {
  id: string
  category: string
  item_name: string
  amount: number | null
  care_level: string | null
  notes: string | null
  sort_order: number
}

type Props = {
  fees: Fee[]
  hasFees: boolean
  facilityId: string
  facilityName: string
}

export default function FloatingActions({ fees, hasFees, facilityId, facilityName }: Props) {
  const [feeOpen, setFeeOpen] = useState(false)
  const [inquiryOpen, setInquiryOpen] = useState(false)

  return (
    <>
      {/* Floating buttons - right side */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
        {hasFees && (
          <button
            onClick={() => { setFeeOpen(true); setInquiryOpen(false) }}
            className="flex items-center gap-2 px-4 py-3 bg-cares-600 text-white rounded-l-xl shadow-lg hover:bg-cares-700 transition-all text-sm font-medium"
          >
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">料金シミュレーション</span>
            <span className="sm:hidden">料金</span>
          </button>
        )}
        <button
          onClick={() => { setInquiryOpen(true); setFeeOpen(false) }}
          className="flex items-center gap-2 px-4 py-3 bg-white text-gray-700 border border-gray-200 rounded-l-xl shadow-lg hover:bg-gray-50 transition-all text-sm font-medium"
        >
          <Mail className="w-4 h-4" />
          <span className="hidden sm:inline">お問い合わせ</span>
          <span className="sm:hidden">問合せ</span>
        </button>
      </div>

      {/* Fee Simulator slide-in panel */}
      {feeOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-50"
            onClick={() => setFeeOpen(false)}
          />
          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-cares-600" />
                <h2 className="text-lg font-bold text-gray-900">料金シミュレーション</h2>
              </div>
              <button
                onClick={() => setFeeOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-500 mb-4">
                介護度とオプションを選択すると自動で月額料金を計算します
              </p>
              <FeeSimulator fees={fees} />
            </div>
          </div>
        </>
      )}

      {/* Inquiry modal */}
      {inquiryOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-50"
            onClick={() => setInquiryOpen(false)}
          />
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-cares-600" />
                  <h2 className="text-lg font-bold text-gray-900">お問い合わせ</h2>
                </div>
                <button
                  onClick={() => setInquiryOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-5">
                <InquiryForm facilityId={facilityId} facilityName={facilityName} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
