'use client'

import { useState, useEffect } from 'react'

type CompletenessBarProps = {
  score: number // 0-100
  tier: string // 'insufficient' | 'basic' | 'good' | 'high' | 'complete'
  size?: 'sm' | 'md' // sm: 一覧カード用, md: 詳細ページ用
}

const tierConfig: Record<string, { label: string; barColor: string; textColor: string; bgColor: string }> = {
  insufficient: {
    label: '情報不足',
    barColor: 'bg-gray-400',
    textColor: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  basic: {
    label: '基本',
    barColor: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
  },
  good: {
    label: '充実',
    barColor: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
  },
  high: {
    label: '高充実',
    barColor: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
  },
  complete: {
    label: '完全',
    barColor: 'bg-amber-500',
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-50',
  },
}

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) return
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // easeOutQuad
      const eased = 1 - (1 - progress) * (1 - progress)
      setValue(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
    return () => setValue(target)
  }, [target, duration])
  return value
}

export default function CompletenessBar({ score, tier, size = 'sm' }: CompletenessBarProps) {
  const [mounted, setMounted] = useState(false)
  const config = tierConfig[tier] || tierConfig.insufficient
  const displayScore = useCountUp(score)

  useEffect(() => {
    setMounted(true)
  }, [])

  const barHeight = size === 'sm' ? 'h-1' : 'h-1.5'
  const fontSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-gray-100 rounded-full overflow-hidden ${barHeight}`}>
        <div
          className={`${config.barColor} ${barHeight} rounded-full transition-all duration-700 ease-out`}
          style={{ width: mounted ? `${score}%` : '0%' }}
        />
      </div>
      <span className={`${fontSize} font-semibold text-gray-700 tabular-nums shrink-0`}>
        {displayScore}%
      </span>
      <span
        className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-md ${fontSize} font-medium ${config.textColor} ${config.bgColor}`}
      >
        {config.label}
      </span>
    </div>
  )
}
