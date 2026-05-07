'use client'

import { useMemo, useState } from 'react'
import { Calculator, CheckCircle2, Info, SlidersHorizontal } from 'lucide-react'

type Fee = {
  id: string
  category: string | null
  item_name: string
  amount: number | null
  care_level: string | null
  notes: string | null
  sort_order: number | null
  billing_unit: string | null
  fee_section: string | null
  amount_max: number | null
  is_optional: boolean | null
}

type Props = {
  fees: Fee[]
}

type NormalizedFee = Omit<Fee, 'category' | 'sort_order' | 'billing_unit' | 'fee_section' | 'is_optional'> & {
  category: string
  sort_order: number
  billing_unit: string
  fee_section: string
  is_optional: boolean
}

type AmountRange = {
  min: number
  max: number
}

const careLevelOrder = ['事業対象者', '要支援1', '要支援2', '要介護1', '要介護2', '要介護3', '要介護4', '要介護5']

const billingUnitLabels: Record<string, string> = {
  monthly: '月',
  daily: '日',
  per_use: '回',
  per_meal: '食',
  per_hour: '時間',
  one_time: '一括',
}

const sectionLabels: Record<string, string> = {
  insurance_estimate: '介護保険分',
  self_pay: '自費分',
  initial_cost: '初期費用',
}

const zeroRange: AmountRange = { min: 0, max: 0 }

function addRange(total: AmountRange, range: AmountRange): AmountRange {
  return {
    min: total.min + range.min,
    max: total.max + range.max,
  }
}

function multiplyRange(range: AmountRange, multiplier: number): AmountRange {
  return {
    min: Math.round(range.min * multiplier),
    max: Math.round(range.max * multiplier),
  }
}

function formatRange(range: AmountRange): string {
  if (range.min === range.max) return `¥${range.min.toLocaleString()}`
  return `¥${range.min.toLocaleString()} 〜 ¥${range.max.toLocaleString()}`
}

export default function FeeSimulator({ fees }: Props) {
  const [selectedCareLevel, setSelectedCareLevel] = useState('')
  const [burdenRatio, setBurdenRatio] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set())
  const [frequencyMode, setFrequencyMode] = useState<'weekly' | 'monthly'>('weekly')
  const [weeklyUses, setWeeklyUses] = useState(2)
  const [monthlyUses, setMonthlyUses] = useState(9)
  const [mealsPerDay, setMealsPerDay] = useState(3)
  const [hoursPerUse, setHoursPerUse] = useState(1)

  const normalizedFees = useMemo(() => {
    return fees
      .map((fee) => ({
        ...fee,
        category: fee.category || 'fixed',
        sort_order: fee.sort_order ?? 0,
        billing_unit: fee.billing_unit || 'monthly',
        fee_section: fee.fee_section || 'self_pay',
        is_optional: fee.is_optional ?? fee.category === 'option',
      }))
      .sort((a, b) => a.sort_order - b.sort_order || a.item_name.localeCompare(b.item_name, 'ja'))
  }, [fees])

  const insuranceFees = normalizedFees.filter((fee) => fee.fee_section === 'insurance_estimate')
  const selfPayFees = normalizedFees.filter((fee) => fee.fee_section === 'self_pay')
  const initialCostFees = normalizedFees.filter((fee) => fee.fee_section === 'initial_cost')

  const careLevelFees = normalizedFees.filter((fee) => fee.category === 'care_level')
  const optionFees = normalizedFees.filter((fee) => fee.is_optional && fee.billing_unit !== 'one_time')

  const availableCareLevels = useMemo(() => {
    const levels = Array.from(new Set(careLevelFees.map((fee) => fee.care_level).filter(Boolean))) as string[]
    return levels.sort((a, b) => {
      const ai = careLevelOrder.indexOf(a)
      const bi = careLevelOrder.indexOf(b)
      if (ai === -1 && bi === -1) return a.localeCompare(b, 'ja')
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }, [careLevelFees])

  const hasDailyOrPerUse = normalizedFees.some((fee) => fee.billing_unit === 'daily' || fee.billing_unit === 'per_use')
  const hasPerMeal = normalizedFees.some((fee) => fee.billing_unit === 'per_meal')
  const hasFoodLikeFees = normalizedFees.some((fee) => /食費|食事|朝食|昼食|夕食|おやつ/.test(fee.item_name))
  const hasPerHour = normalizedFees.some((fee) => fee.billing_unit === 'per_hour')
  const hasInsuranceFees = insuranceFees.length > 0
  const hasFrequencyBasedFees = hasDailyOrPerUse || hasPerMeal || hasPerHour || hasFoodLikeFees
  const hasConditionInputs = availableCareLevels.length > 0 || hasInsuranceFees || hasFrequencyBasedFees
  const monthlyFrequency = frequencyMode === 'weekly' ? Math.max(1, Math.round(weeklyUses * 4.3)) : monthlyUses

  function getBaseRange(fee: NormalizedFee): AmountRange | null {
    const min = fee.amount ?? fee.amount_max
    const max = fee.amount_max ?? fee.amount
    if (min === null || max === null) return null
    return {
      min: Math.min(min, max),
      max: Math.max(min, max),
    }
  }

  function calcMonthlyRange(fee: NormalizedFee): AmountRange | null {
    if (fee.billing_unit === 'one_time') return null
    const baseRange = getBaseRange(fee)
    if (!baseRange) return null

    switch (fee.billing_unit) {
      case 'daily':
      case 'per_use':
        return multiplyRange(baseRange, monthlyFrequency)
      case 'per_meal':
        return multiplyRange(baseRange, mealsPerDay * monthlyFrequency)
      case 'per_hour':
        return multiplyRange(baseRange, hoursPerUse * monthlyFrequency)
      case 'monthly':
      default:
        return baseRange
    }
  }

  function calcDisplayMonthlyRange(fee: NormalizedFee): AmountRange | null {
    const monthlyRange = calcMonthlyRange(fee)
    if (!monthlyRange) return null
    if (fee.fee_section !== 'insurance_estimate') return monthlyRange

    // 介護保険分は事業所が登録した1割負担目安を基準に、利用者の負担割合で表示する。
    return multiplyRange(monthlyRange, burdenRatio)
  }

  function shouldIncludeFee(fee: NormalizedFee): boolean {
    if (fee.billing_unit === 'one_time') return false
    if (fee.category === 'care_level') return fee.care_level === selectedCareLevel
    if (fee.is_optional) return selectedOptions.has(fee.id)
    return true
  }

  function calcSectionTotal(section: string): AmountRange {
    return normalizedFees
      .filter((fee) => fee.fee_section === section && shouldIncludeFee(fee))
      .reduce((total, fee) => {
        const range = calcDisplayMonthlyRange(fee)
        return range ? addRange(total, range) : total
      }, zeroRange)
  }

  const insuranceTotal = useMemo(
    () => calcSectionTotal('insurance_estimate'),
    [normalizedFees, selectedCareLevel, selectedOptions, monthlyFrequency, mealsPerDay, hoursPerUse, burdenRatio]
  )
  const selfPayTotal = useMemo(
    () => calcSectionTotal('self_pay'),
    [normalizedFees, selectedCareLevel, selectedOptions, monthlyFrequency, mealsPerDay, hoursPerUse, burdenRatio]
  )
  const monthlyTotal = addRange(insuranceTotal, selfPayTotal)

  const selectedOptionCount = optionFees.filter((fee) => selectedOptions.has(fee.id)).length
  const needsCareLevel = availableCareLevels.length > 0 && !selectedCareLevel

  function formatFeeDisplay(fee: NormalizedFee): string {
    const baseRange = getBaseRange(fee)
    if (!baseRange) return '要問合せ'
    if (fee.billing_unit === 'monthly') return formatRange(baseRange)
    return `${formatRange(baseRange)}/${billingUnitLabels[fee.billing_unit] || '月'}`
  }

  function formatMonthlyCalc(fee: NormalizedFee): string | null {
    if (fee.billing_unit === 'monthly' || fee.billing_unit === 'one_time') return null
    const baseRange = getBaseRange(fee)
    const monthlyRange = calcMonthlyRange(fee)
    if (!baseRange || !monthlyRange) return null

    const baseText = (() => {
      if (fee.billing_unit === 'daily') return `${formatRange(baseRange)}/日 × ${monthlyFrequency}日`
      if (fee.billing_unit === 'per_use') return `${formatRange(baseRange)}/回 × ${monthlyFrequency}回`
      if (fee.billing_unit === 'per_meal') return `${formatRange(baseRange)}/食 × ${mealsPerDay}食 × ${monthlyFrequency}日`
      if (fee.billing_unit === 'per_hour') return `${formatRange(baseRange)}/時間 × ${hoursPerUse}時間 × ${monthlyFrequency}回`
      return ''
    })()

    const adjustedRange = calcDisplayMonthlyRange(fee)
    if (!adjustedRange) return null
    if (fee.fee_section === 'insurance_estimate' && burdenRatio > 1) {
      return `${baseText} = ${formatRange(monthlyRange)}（1割目安） × ${burdenRatio} = ${formatRange(adjustedRange)}`
    }
    return `${baseText} = ${formatRange(adjustedRange)}`
  }

  function toggleOption(id: string) {
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

  function renderFeeRow(fee: NormalizedFee) {
    const selected = selectedOptions.has(fee.id)
    const monthlyRange = shouldIncludeFee(fee) ? calcDisplayMonthlyRange(fee) : null
    const monthlyCalc = formatMonthlyCalc(fee)
    const disabledByCareLevel = fee.category === 'care_level' && fee.care_level !== selectedCareLevel

    if (disabledByCareLevel) return null

    const content = (
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              {fee.item_name}
              {fee.care_level && (
                <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                  {fee.care_level}
                </span>
              )}
              {fee.is_optional && (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                  任意
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-slate-500">{formatFeeDisplay(fee)}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-slate-950">
              {monthlyRange ? formatRange(monthlyRange) : fee.is_optional && !selected ? '未選択' : '要問合せ'}
            </p>
            {fee.billing_unit !== 'one_time' && <p className="mt-0.5 text-xs text-slate-400">月額反映</p>}
          </div>
        </div>
        {monthlyCalc && <p className="mt-2 text-xs leading-relaxed text-slate-500">{monthlyCalc}</p>}
        {fee.notes && <p className="mt-1 text-xs leading-relaxed text-slate-400">{fee.notes}</p>}
      </div>
    )

    if (fee.is_optional) {
      return (
        <label key={fee.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-cares-200">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => toggleOption(fee.id)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-cares-600 focus:ring-cares-500"
          />
          {content}
        </label>
      )
    }

    return (
      <div key={fee.id} className="rounded-2xl border border-slate-200 bg-white p-4">
        {content}
      </div>
    )
  }

  function renderFeeSection(sectionFees: NormalizedFee[], title: string, section: string) {
    if (sectionFees.length === 0) return null

    const visibleFees = sectionFees.filter((fee) => {
      if (fee.billing_unit === 'one_time') return true
      if (fee.category === 'care_level') return !selectedCareLevel || fee.care_level === selectedCareLevel
      return true
    })

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          {section !== 'initial_cost' && (
            <span className="text-sm font-bold text-cares-700">
              {formatRange(section === 'insurance_estimate' ? insuranceTotal : selfPayTotal)}
            </span>
          )}
        </div>

        {section === 'insurance_estimate' && needsCareLevel && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            介護度を選択すると、事業所が設定した介護度別料金が月額目安に反映されます。
          </div>
        )}

        <div className="space-y-3">
          {visibleFees.map((fee) => renderFeeRow(fee))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-5 rounded-2xl bg-slate-950 p-4 text-white">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-cares-200" />
          <p className="text-sm font-bold">料金シミュレーション</p>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          介護度、負担割合、利用頻度を入れると、事業所が設定した料金表をもとに月額目安を計算します。
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-800">利用条件</h3>
        </div>

        <div className="grid gap-4">
          {!hasConditionInputs && (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-bold text-slate-800">この料金表では、利用者が設定する条件はありません</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                現在登録されている料金は月額などの固定料金のみです。事業所が「介護度別」「日額」「1回」「1食」「1時間」の料金を設定すると、ここに介護度・負担割合・利用頻度の入力欄が表示されます。
              </p>
            </div>
          )}

          {availableCareLevels.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">介護度</label>
              <select
                value={selectedCareLevel}
                onChange={(event) => setSelectedCareLevel(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-cares-500 focus:ring-2 focus:ring-cares-500"
              >
                <option value="">選択してください</option>
                {availableCareLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          )}

          {hasInsuranceFees && (
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">介護保険の負担割合</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setBurdenRatio(ratio)}
                    className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                      burdenRatio === ratio
                        ? 'bg-cares-700 text-white'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-cares-200'
                    }`}
                  >
                    {ratio}割
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                介護保険分は、事業所が登録した1割負担目安を基準に表示します。
              </p>
            </div>
          )}

          {hasFrequencyBasedFees && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500">利用頻度</label>
                <span className="text-sm font-bold text-cares-700">月{monthlyFrequency}日 / 回換算</span>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2">
                {[
                  ['weekly', '週あたり'],
                  ['monthly', '月あたり'],
                ].map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFrequencyMode(mode as 'weekly' | 'monthly')}
                    className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                      frequencyMode === mode
                        ? 'bg-cares-700 text-white'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-cares-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {frequencyMode === 'weekly' ? (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">週{weeklyUses}回利用</span>
                    <span className="text-xs text-slate-400">月{monthlyFrequency}回として計算</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={7}
                    value={weeklyUses}
                    onChange={(event) => setWeeklyUses(parseInt(event.target.value, 10))}
                    className="h-2 w-full cursor-pointer accent-cares-700"
                  />
                  <div className="mt-1 flex justify-between text-xs text-slate-400">
                    <span>週1回</span>
                    <span>週7回</span>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {[1, 2, 3, 5].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setWeeklyUses(count)}
                        className={`rounded-lg px-2 py-2 text-xs font-bold transition ${
                          weeklyUses === count
                            ? 'bg-cares-100 text-cares-800 ring-1 ring-cares-200'
                            : 'bg-white text-slate-500 ring-1 ring-slate-200'
                        }`}
                      >
                        週{count}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">月{monthlyUses}回利用</span>
                    <span className="text-xs text-slate-400">直接指定</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={31}
                    value={monthlyUses}
                    onChange={(event) => setMonthlyUses(parseInt(event.target.value, 10))}
                    className="h-2 w-full cursor-pointer accent-cares-700"
                  />
                  <div className="mt-1 flex justify-between text-xs text-slate-400">
                    <span>1回</span>
                    <span>31回</span>
                  </div>
                </>
              )}

              <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-200">
                日額・1回・1食・1時間単位の料金は、この利用頻度をもとに月額換算します。
              </div>
            </div>
          )}

          {hasFoodLikeFees && !hasPerMeal && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-sm font-bold text-amber-900">食費は月額として登録されています</p>
              <p className="mt-2 text-xs leading-relaxed text-amber-800">
                利用頻度と食数を入力できますが、この食費は月額固定のため金額は変わりません。頻度で計算したい場合は、事業所側で食費の課金単位を「1食」に設定してください。
              </p>
            </div>
          )}

          {(hasPerMeal || hasFoodLikeFees) && (
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">1日の食数</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setMealsPerDay(count)}
                    className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                      mealsPerDay === count
                        ? 'bg-cares-700 text-white'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-cares-200'
                    }`}
                  >
                    {count}食
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasPerHour && (
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">1回あたりの利用時間</label>
              <input
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                value={hoursPerUse}
                onChange={(event) => setHoursPerUse(parseFloat(event.target.value) || 1)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-cares-500 focus:ring-2 focus:ring-cares-500"
              />
            </div>
          )}
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-cares-200 bg-cares-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-cares-900">月額合計目安</p>
            <p className="mt-1 text-xs text-cares-700">
              介護保険分 + 自費分 + 選択した任意料金
            </p>
          </div>
          <p className="shrink-0 text-right text-2xl font-bold text-cares-900">
            {monthlyTotal.max > 0 ? formatRange(monthlyTotal) : '---'}
          </p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-cares-100">
            <p className="text-xs font-bold text-slate-500">介護保険分</p>
            <p className="mt-1 text-sm font-bold text-slate-950">{formatRange(insuranceTotal)}</p>
          </div>
          <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-cares-100">
            <p className="text-xs font-bold text-slate-500">自費分</p>
            <p className="mt-1 text-sm font-bold text-slate-950">{formatRange(selfPayTotal)}</p>
          </div>
          <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-cares-100">
            <p className="text-xs font-bold text-slate-500">任意料金</p>
            <p className="mt-1 text-sm font-bold text-slate-950">{selectedOptionCount}件選択中</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {renderFeeSection(insuranceFees, sectionLabels.insurance_estimate, 'insurance_estimate')}
        {renderFeeSection(selfPayFees, sectionLabels.self_pay, 'self_pay')}
        {renderFeeSection(initialCostFees, sectionLabels.initial_cost, 'initial_cost')}
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p>
          表示金額は事業所が登録した料金表をもとにした概算です。実際の請求額は介護保険負担割合、加算、地域区分、利用状況、その他実費により変動します。正確な金額は事業所へ直接ご確認ください。
        </p>
      </div>

      {monthlyTotal.max > 0 && (
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-cares-700">
          <CheckCircle2 className="h-4 w-4" />
          入力条件に応じて、月額目安が更新されています。
        </div>
      )}
    </div>
  )
}
