'use client'

import { useEffect, useRef, useState } from 'react'
import { Calculator, Clock3, X } from 'lucide-react'
import FeeSimulator from './FeeSimulator'

import type { Fee, Tariff } from '@/lib/fee-calculation'

type Props = {
  fees: Fee[]
  feePattern?: string
  tariffs?: Tariff[]
  serviceType?: string
  facilityName?: string
  address?: string
  providerSettings?: unknown
  feesUnavailable?: boolean
}

export default function FloatingFeeSimulator({ fees, feePattern, tariffs = [], serviceType, facilityName, address, feesUnavailable, providerSettings }: Props) {
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
              {latestFeeUpdateLabel && <p className="mb-4 flex items-center gap-1.5 text-xs text-gray-500"><Clock3 className="h-3.5 w-3.5" />料金表の最終更新 {latestFeeUpdateLabel}</p>}
              <FeeSimulator providerSettings={providerSettings} fees={fees} tariffs={tariffs} serviceType={serviceType} facilityName={facilityName} address={address} feesUnavailable={feesUnavailable} />
            </div>
          </div>
        </>
      )}
    </>
  )
}
