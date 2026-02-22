'use client'

import { useState, useMemo } from 'react'
import { Calculator } from 'lucide-react'

type Fee = {
  id: string
  category: string  // 'fixed' | 'care_level' | 'option'
  item_name: string
  amount: number | null
  care_level: string | null
  notes: string | null
  sort_order: number
}

type Props = {
  fees: Fee[]
}

const careLevelLabels: Record<string, string> = {
  '要支援1': '要支援1',
  '要支援2': '要支援2',
  '要介護1': '要介護1',
  '要介護2': '要介護2',
  '要介護3': '要介護3',
  '要介護4': '要介護4',
  '要介護5': '要介護5',
}

export default function FeeSimulator({ fees }: Props) {
  const [selectedCareLevel, setSelectedCareLevel] = useState('')
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set())

  const fixedFees = fees.filter((f) => f.category === 'fixed')
  const careLevelFees = fees.filter((f) => f.category === 'care_level')
  const optionFees = fees.filter((f) => f.category === 'option')

  // 利用可能な介護度一覧
  const availableCareLevels = useMemo(() => {
    const levels = new Set(careLevelFees.map((f) => f.care_level).filter(Boolean))
    return Array.from(levels) as string[]
  }, [careLevelFees])

  // 選択された介護度に対応する料金
  const selectedCareLevelFees = useMemo(() => {
    if (!selectedCareLevel) return []
    return careLevelFees.filter((f) => f.care_level === selectedCareLevel)
  }, [careLevelFees, selectedCareLevel])

  // 選択されたオプション料金
  const selectedOptionFees = useMemo(() => {
    return optionFees.filter((f) => selectedOptions.has(f.id))
  }, [optionFees, selectedOptions])

  // 月額合計
  const totalMonthly = useMemo(() => {
    let total = 0
    fixedFees.forEach((f) => { if (f.amount) total += f.amount })
    selectedCareLevelFees.forEach((f) => { if (f.amount) total += f.amount })
    selectedOptionFees.forEach((f) => { if (f.amount) total += f.amount })
    return total
  }, [fixedFees, selectedCareLevelFees, selectedOptionFees])

  const toggleOption = (id: string) => {
    setSelectedOptions((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const formatAmount = (amount: number | null) => {
    if (amount === null) return '要問合せ'
    return `¥${amount.toLocaleString()}`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* 固定費用 */}
      {fixedFees.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">基本費用（月額）</h3>
          <div className="space-y-2">
            {fixedFees.map((fee) => (
              <div key={fee.id} className="flex items-center justify-between py-1.5 border-b border-gray-100">
                <div>
                  <span className="text-sm text-gray-700">{fee.item_name}</span>
                  {fee.notes && <p className="text-xs text-gray-400">{fee.notes}</p>}
                </div>
                <span className="text-sm font-medium text-gray-900">{formatAmount(fee.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 介護度別費用 */}
      {availableCareLevels.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">介護度別費用</h3>
          <select
            value={selectedCareLevel}
            onChange={(e) => setSelectedCareLevel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white mb-3 focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
          >
            <option value="">介護度を選択</option>
            {availableCareLevels.map((level) => (
              <option key={level} value={level}>
                {careLevelLabels[level] || level}
              </option>
            ))}
          </select>
          {selectedCareLevelFees.length > 0 && (
            <div className="space-y-2">
              {selectedCareLevelFees.map((fee) => (
                <div key={fee.id} className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <div>
                    <span className="text-sm text-gray-700">{fee.item_name}</span>
                    {fee.notes && <p className="text-xs text-gray-400">{fee.notes}</p>}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{formatAmount(fee.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* オプション費用 */}
      {optionFees.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">オプション費用</h3>
          <div className="space-y-2">
            {optionFees.map((fee) => (
              <label
                key={fee.id}
                className="flex items-center gap-3 py-1.5 border-b border-gray-100 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedOptions.has(fee.id)}
                  onChange={() => toggleOption(fee.id)}
                  className="w-4 h-4 rounded border-gray-300 text-cares-600 focus:ring-cares-500"
                />
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-700">{fee.item_name}</span>
                    {fee.notes && <p className="text-xs text-gray-400">{fee.notes}</p>}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{formatAmount(fee.amount)}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 合計 */}
      <div className="pt-4 border-t-2 border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-cares-600" />
            <span className="font-semibold text-gray-900">月額目安</span>
          </div>
          <span className="text-2xl font-bold text-cares-700">
            {totalMonthly > 0 ? `¥${totalMonthly.toLocaleString()}` : '---'}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          ※ 上記は概算です。詳しくは施設にお問い合わせください。
        </p>
      </div>
    </div>
  )
}
