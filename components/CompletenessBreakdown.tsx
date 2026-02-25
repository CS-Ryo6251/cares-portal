'use client'

import { useState, useEffect } from 'react'
import { BedDouble, Building2, Coins, FileText, LayoutList, ShieldCheck } from 'lucide-react'
import CompletenessBar from './CompletenessBar'

type CategoryScore = {
  score: number
  max: number
}

type CompletenessBreakdownProps = {
  categoryScores: {
    vacancy: CategoryScore
    basic: CategoryScore
    fees: CategoryScore
    notes: CategoryScore
    overview: CategoryScore
    official: CategoryScore
  }
  score: number
  tier: string
}

type CategoryConfig = {
  key: keyof CompletenessBreakdownProps['categoryScores']
  label: string
  icon: typeof BedDouble
  iconColor: string
  barColor: string
  nudge?: { label: string }
}

const categories: CategoryConfig[] = [
  {
    key: 'vacancy',
    label: '空き情報',
    icon: BedDouble,
    iconColor: 'text-green-500',
    barColor: 'bg-green-500',
    nudge: { label: '空き情報を投稿' },
  },
  {
    key: 'basic',
    label: '基本情報',
    icon: Building2,
    iconColor: 'text-blue-500',
    barColor: 'bg-blue-500',
  },
  {
    key: 'fees',
    label: '料金情報',
    icon: Coins,
    iconColor: 'text-purple-500',
    barColor: 'bg-purple-500',
    nudge: { label: '料金情報を追加' },
  },
  {
    key: 'notes',
    label: '専門職メモ',
    icon: FileText,
    iconColor: 'text-orange-500',
    barColor: 'bg-orange-500',
    nudge: { label: 'メモを投稿' },
  },
  {
    key: 'overview',
    label: '概要・特徴',
    icon: LayoutList,
    iconColor: 'text-teal-500',
    barColor: 'bg-teal-500',
  },
  {
    key: 'official',
    label: '公式認証',
    icon: ShieldCheck,
    iconColor: 'text-amber-500',
    barColor: 'bg-amber-500',
  },
]

export default function CompletenessBreakdown({
  categoryScores,
  score,
  tier,
}: CompletenessBreakdownProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      {/* Total score */}
      <div className="mb-5">
        <p className="text-sm font-medium text-gray-500 mb-2">情報充実度</p>
        <CompletenessBar score={score} tier={tier} size="md" />
      </div>

      {/* Category breakdown */}
      <div className="space-y-3">
        {categories.map((cat, index) => {
          const catScore = categoryScores[cat.key]
          const percentage = catScore.max > 0 ? Math.round((catScore.score / catScore.max) * 100) : 0
          const Icon = cat.icon
          const showNudge = cat.nudge && catScore.score === 0

          return (
            <div key={cat.key} className="flex items-center gap-3">
              <Icon className={`w-4 h-4 shrink-0 ${cat.iconColor}`} />
              <span className="text-sm text-gray-700 w-20 shrink-0">{cat.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full overflow-hidden h-1.5">
                <div
                  className={`${cat.barColor} h-1.5 rounded-full transition-all duration-700 ease-out`}
                  style={{
                    width: mounted ? `${percentage}%` : '0%',
                    transitionDelay: mounted ? `${index * 50}ms` : '0ms',
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 tabular-nums shrink-0 w-12 text-right">
                {catScore.score}/{catScore.max}点
              </span>
              {showNudge && (
                <span className="text-xs text-cares-600 hover:text-cares-700 cursor-pointer shrink-0">
                  {cat.nudge!.label}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
