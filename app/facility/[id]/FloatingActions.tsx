'use client'

import { useState } from 'react'
import { Calculator, X } from 'lucide-react'
import FeeSimulator from './FeeSimulator'

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
}

export default function FloatingFeeSimulator({ fees }: Props) {
  const [open, setOpen] = useState(false)

  if (fees.length === 0) return null

  return (
    <>
      {/* Floating button - right side, vertical text */}
      <button
        onClick={() => setOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-cares-600 text-white rounded-l-xl shadow-lg hover:bg-cares-700 transition-all px-2 py-5"
        style={{ writingMode: 'vertical-rl' }}
      >
        <span className="flex items-center gap-1.5 text-sm font-medium tracking-wider">
          <Calculator className="w-4 h-4" style={{ writingMode: 'horizontal-tb' }} />
          料金シミュレーション
        </span>
      </button>

      {/* Slide-in panel */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-50"
            onClick={() => setOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-cares-600" />
                <h2 className="text-lg font-bold text-gray-900">料金シミュレーション</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
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
    </>
  )
}
