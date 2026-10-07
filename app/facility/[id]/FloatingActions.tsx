'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BadgeCheck, Calculator, Clock3, RefreshCw, X } from 'lucide-react'
import FeeSimulator from './FeeSimulator'

import type { Fee, Tariff } from '@/lib/fee-calculation'

type Props = {
  fees: Fee[]
  feePattern?: string
  tariffs?: Tariff[]
  serviceType?: string
  facilityName?: string
  address?: string
  feesUnavailable?: boolean
}

export default function FloatingFeeSimulator({ fees, feePattern, tariffs = [], serviceType, facilityName, address, feesUnavailable }: Props) {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  function openDialog() { openerRef.current = document.activeElement as HTMLElement; setOpen(true) }
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key !== 'Tab') return
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button, input, select, summary, a[href]') || []).filter(el => el.getClientRects().length && !el.hasAttribute('disabled'))
      const first = controls[0], last = controls[controls.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKey); openerRef.current?.focus() }
  }, [open])
  if (feePattern === 'no_charge' || (!fees.length && !tariffs.length && !feesUnavailable)) return null

  const latestFeeUpdate = fees.reduce<string | null>((latest, fee) => {
    const candidate = fee.updated_at || fee.created_at || null
    if (!candidate || !Number.isFinite(new Date(candidate).getTime())) return latest
    if (!latest || new Date(candidate).getTime() > new Date(latest).getTime()) return candidate
    return latest
  }, null)
  const latestFeeUpdateLabel = latestFeeUpdate
    ? new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(latestFeeUpdate))
    : null

  return (
    <>
      <section className="mb-6 overflow-hidden rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50 shadow-sm">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-cares-600 px-2.5 py-1 text-xs font-bold text-white">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {tariffs.length ? '公定単価で試算' : '事業所の登録料金'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-cares-700 ring-1 ring-cares-200">
                  <RefreshCw className="h-3.5 w-3.5" />
                  {fees.length ? 'CareSpace OS 料金連携' : '自費料金は事業所に確認'}
                </span>
              </div>
              <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                この事業所の月額料金を計算
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                介護度・負担割合・利用時間・回数から試算。事業所が公開した食費などの自費も、内訳とあわせて確認できます。
              </p>
              {latestFeeUpdateLabel && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Clock3 className="h-3.5 w-3.5 text-cares-500" />
                  料金表の最終更新 {latestFeeUpdateLabel}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={openDialog}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-cares-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-cares-200 transition hover:bg-cares-700 sm:w-auto"
            >
              <Calculator className="h-5 w-5" />
              月額目安を計算する
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Mobile: bottom-fixed horizontal button */}
      <button
        onClick={openDialog}
        className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-cares-600 text-white rounded-xl shadow-lg hover:bg-cares-700 transition-all px-4 py-3.5 flex items-center justify-center gap-2"
      >
        <Calculator className="w-5 h-5" />
        <span className="text-sm font-semibold">料金シミュレーション</span>
      </button>

      {/* Desktop: right-side vertical button */}
      <button
        onClick={openDialog}
        className="hidden md:block fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-cares-600 text-white rounded-l-xl shadow-lg hover:bg-cares-700 transition-all px-2 py-5"
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
            className="!m-0 fixed inset-0 bg-black/30 z-50"
            onClick={() => setOpen(false)}
          />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="料金シミュレーション" className="!m-0 fixed inset-0 md:inset-auto md:top-0 md:right-0 md:h-full md:w-full md:max-w-xl bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-cares-600" />
                <h2 className="text-base sm:text-lg font-bold text-gray-900">料金シミュレーション</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="料金シミュレーションを閉じる"
                autoFocus
                className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors -mr-1"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 sm:p-5 pb-20 md:pb-5">
              <p className="text-sm text-gray-500 mb-4">
                条件を変えると金額が更新されます。利用者への説明用に、条件と内訳をコピーできます。
              </p>
              <FeeSimulator fees={fees} tariffs={tariffs} serviceType={serviceType} facilityName={facilityName} address={address} feesUnavailable={feesUnavailable} />
            </div>
          </div>
        </>
      )}
    </>
  )
}
