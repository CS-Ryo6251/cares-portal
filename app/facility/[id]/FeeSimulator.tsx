'use client'

import { useState, useMemo } from 'react'
import { Calculator, SlidersHorizontal } from 'lucide-react'

type Fee = {
  id: string
  category: string
  item_name: string
  amount: number | null
  care_level: string | null
  notes: string | null
  sort_order: number
  billing_unit: string
  fee_section: string
  amount_max: number | null
  is_optional: boolean
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

const billingUnitLabels: Record<string, string> = {
  monthly: '月',
  daily: '日',
  per_use: '回',
  per_meal: '食',
  per_hour: '時間',
  one_time: '一括',
}

export default function FeeSimulator({ fees }: Props) {
  const [selectedCareLevel, setSelectedCareLevel] = useState('')
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set())
  const [daysPerMonth, setDaysPerMonth] = useState(20)
  const [mealsPerDay, setMealsPerDay] = useState(3)
  const [hoursPerUse, setHoursPerUse] = useState(1)

  // fee_sectionでグルーピング
  const insuranceFees = fees.filter((f) => f.fee_section === 'insurance_estimate')
  const selfPayFees = fees.filter((f) => f.fee_section === 'self_pay')
  const initialCostFees = fees.filter((f) => f.fee_section === 'initial_cost')

  // 介護度別の判定用
  const careLevelFees = fees.filter((f) => f.category === 'care_level')

  // billing_unitに応じた条件入力の表示判定
  const hasDailyOrPerUse = fees.some((f) => f.billing_unit === 'daily' || f.billing_unit === 'per_use')
  const hasPerMeal = fees.some((f) => f.billing_unit === 'per_meal')
  const hasPerHour = fees.some((f) => f.billing_unit === 'per_hour')

  // 利用可能な介護度一覧
  const availableCareLevels = useMemo(() => {
    const levels = new Set(careLevelFees.map((f) => f.care_level).filter(Boolean))
    return Array.from(levels) as string[]
  }, [careLevelFees])

  // 単一料金項目の月額計算
  const calcMonthlyAmount = (fee: Fee): number => {
    if (fee.amount === null) return 0
    switch (fee.billing_unit) {
      case 'daily':
        return fee.amount * daysPerMonth
      case 'per_use':
        return fee.amount * daysPerMonth
      case 'per_meal':
        return fee.amount * mealsPerDay * daysPerMonth
      case 'per_hour':
        return fee.amount * hoursPerUse * daysPerMonth
      case 'one_time':
        return 0 // 月額合計には含めない
      case 'monthly':
      default:
        return fee.amount
    }
  }

  // 料金項目の表示金額
  const formatFeeDisplay = (fee: Fee): string => {
    if (fee.amount === null) return '要問合せ'
    if (fee.amount_max !== null) {
      return `¥${fee.amount.toLocaleString()} 〜 ¥${fee.amount_max.toLocaleString()}`
    }
    const unitLabel = billingUnitLabels[fee.billing_unit]
    if (fee.billing_unit === 'monthly') {
      return `¥${fee.amount.toLocaleString()}`
    }
    return `¥${fee.amount.toLocaleString()}/${unitLabel}`
  }

  // 月額計算済み表示
  const formatMonthlyCalc = (fee: Fee): string | null => {
    if (fee.amount === null || fee.billing_unit === 'monthly' || fee.billing_unit === 'one_time') return null
    const monthly = calcMonthlyAmount(fee)
    if (fee.billing_unit === 'daily') return `¥${fee.amount.toLocaleString()}/日 × ${daysPerMonth}日 = ¥${monthly.toLocaleString()}`
    if (fee.billing_unit === 'per_use') return `¥${fee.amount.toLocaleString()}/回 × ${daysPerMonth}回 = ¥${monthly.toLocaleString()}`
    if (fee.billing_unit === 'per_meal') return `¥${fee.amount.toLocaleString()}/食 × ${mealsPerDay}食 × ${daysPerMonth}日 = ¥${monthly.toLocaleString()}`
    if (fee.billing_unit === 'per_hour') return `¥${fee.amount.toLocaleString()}/h × ${hoursPerUse}h × ${daysPerMonth}回 = ¥${monthly.toLocaleString()}`
    return null
  }

  // 月額合計
  const totalMonthly = useMemo(() => {
    let total = 0
    const monthlyFees = fees.filter((f) => f.billing_unit !== 'one_time')

    monthlyFees.forEach((f) => {
      // 介護度別: 選択された介護度のみ
      if (f.category === 'care_level') {
        if (f.care_level === selectedCareLevel) {
          total += calcMonthlyAmount(f)
        }
        return
      }
      // オプション: 選択されたもののみ
      if (f.is_optional) {
        if (selectedOptions.has(f.id)) {
          total += calcMonthlyAmount(f)
        }
        return
      }
      // それ以外: 全て加算
      total += calcMonthlyAmount(f)
    })
    return total
  }, [fees, selectedCareLevel, selectedOptions, daysPerMonth, mealsPerDay, hoursPerUse])

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

  // セクション内の料金をレンダリング
  const renderFeeSection = (sectionFees: Fee[], title: string) => {
    if (sectionFees.length === 0) return null

    // 介護度別は特別扱い
    const careLevelItems = sectionFees.filter((f) => f.category === 'care_level')
    const optionalItems = sectionFees.filter((f) => f.is_optional && f.category !== 'care_level')
    const normalItems = sectionFees.filter((f) => !f.is_optional && f.category !== 'care_level')

    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
        <div className="space-y-2">
          {/* 通常項目 */}
          {normalItems.map((fee) => (
            <div key={fee.id} className="py-1.5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{fee.item_name}</span>
                <span className="text-sm font-medium text-gray-900">{formatFeeDisplay(fee)}</span>
              </div>
              {formatMonthlyCalc(fee) && (
                <p className="text-xs text-gray-400 mt-0.5">{formatMonthlyCalc(fee)}</p>
              )}
              {fee.notes && <p className="text-xs text-gray-400 mt-0.5">{fee.notes}</p>}
            </div>
          ))}

          {/* 介護度別 */}
          {careLevelItems.length > 0 && (
            <>
              {selectedCareLevel ? (
                careLevelItems
                  .filter((f) => f.care_level === selectedCareLevel)
                  .map((fee) => (
                    <div key={fee.id} className="py-1.5 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-gray-700">{fee.item_name}</span>
                          <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{fee.care_level}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{formatFeeDisplay(fee)}</span>
                      </div>
                      {formatMonthlyCalc(fee) && (
                        <p className="text-xs text-gray-400 mt-0.5">{formatMonthlyCalc(fee)}</p>
                      )}
                    </div>
                  ))
              ) : (
                <p className="text-xs text-gray-400 py-1.5">介護度を選択すると費用が表示されます</p>
              )}
            </>
          )}

          {/* オプション */}
          {optionalItems.map((fee) => (
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
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{fee.item_name}</span>
                  <span className="text-sm font-medium text-gray-900">{formatFeeDisplay(fee)}</span>
                </div>
                {selectedOptions.has(fee.id) && formatMonthlyCalc(fee) && (
                  <p className="text-xs text-gray-400 mt-0.5">{formatMonthlyCalc(fee)}</p>
                )}
                {fee.notes && <p className="text-xs text-gray-400 mt-0.5">{fee.notes}</p>}
              </div>
            </label>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
      {/* シミュレーション条件 */}
      {(availableCareLevels.length > 0 || hasDailyOrPerUse || hasPerMeal || hasPerHour) && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">シミュレーション条件</h3>
          </div>
          <div className="space-y-3">
            {/* 介護度選択 */}
            {availableCareLevels.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">介護度</label>
                <select
                  value={selectedCareLevel}
                  onChange={(e) => setSelectedCareLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
                >
                  <option value="">介護度を選択</option>
                  {availableCareLevels.map((level) => (
                    <option key={level} value={level}>
                      {careLevelLabels[level] || level}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 利用日数 */}
            {hasDailyOrPerUse && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  月の利用日数: <span className="text-cares-600 font-bold">{daysPerMonth}日</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={31}
                  value={daysPerMonth}
                  onChange={(e) => setDaysPerMonth(parseInt(e.target.value))}
                  className="w-full h-2 accent-cares-600 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>1日</span>
                  <span>31日</span>
                </div>
              </div>
            )}

            {/* 食数 */}
            {hasPerMeal && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">1日の食数</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setMealsPerDay(n)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        mealsPerDay === n
                          ? 'bg-cares-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-600 hover:border-cares-400'
                      }`}
                    >
                      {n}食
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 利用時間 */}
            {hasPerHour && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">1回の利用時間（時間）</label>
                <input
                  type="number"
                  min={0.5}
                  max={24}
                  step={0.5}
                  value={hoursPerUse}
                  onChange={(e) => setHoursPerUse(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 料金内訳 */}
      {renderFeeSection(insuranceFees, '介護サービス費（目安）')}
      {renderFeeSection(selfPayFees, '自費料金')}

      {/* 月額合計 */}
      <div className="pt-4 border-t-2 border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-cares-600" />
            <span className="font-semibold text-gray-900">月額合計目安</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-cares-700">
            {totalMonthly > 0 ? `¥${totalMonthly.toLocaleString()}` : '---'}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          ※ 上記は概算です。詳しくは施設にお問い合わせください。
        </p>
      </div>

      {/* 初期費用 */}
      {initialCostFees.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">初期費用</h3>
          <div className="space-y-2">
            {initialCostFees.map((fee) => (
              <div key={fee.id} className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-100">
                <div className="min-w-0">
                  <span className="text-sm text-gray-700">{fee.item_name}</span>
                  {fee.notes && <p className="text-xs text-gray-400 mt-0.5">{fee.notes}</p>}
                </div>
                <span className="text-sm font-medium text-gray-900 shrink-0">{formatFeeDisplay(fee)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
