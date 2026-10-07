'use client'

import { ArrowRight, BadgeCheck, Building2, ShieldCheck, X } from 'lucide-react'
import { CARESPACE_MANAGEMENT_URL } from '@/lib/cares-navigation'

type OwnerClaimModalProps = {
  listingId: string
  facilityName: string
  jigyoshoNumber?: string | null
  onClose: () => void
}

function buildCareSpaceSignupUrl({
  listingId,
  facilityName,
  jigyoshoNumber,
}: Omit<OwnerClaimModalProps, 'onClose'>) {
  const params = new URLSearchParams({
    source: 'cares',
    listing_id: listingId,
    facility_name: facilityName,
  })
  if (jigyoshoNumber) params.set('facility_number', jigyoshoNumber)
  return `https://app.carespace.jp/signup/new-organization?${params.toString()}`
}

export default function OwnerClaimModal({
  listingId,
  facilityName,
  jigyoshoNumber,
  onClose,
}: OwnerClaimModalProps) {
  const signupUrl = buildCareSpaceSignupUrl({ listingId, facilityName, jigyoshoNumber })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} aria-label="閉じる" />
      <div className="relative w-full overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:mx-4 sm:max-w-md sm:rounded-[2rem]">
        <div className="bg-gradient-to-br from-cares-950 via-cares-700 to-cares-500 px-6 pb-7 pt-6 text-white">
          <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white" aria-label="閉じる">
            <X className="h-5 w-5" />
          </button>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <Building2 className="h-5 w-5" />
          </span>
          <p className="mt-5 text-xs font-bold tracking-[0.14em] text-white/60">FOR CARE PROVIDERS</p>
          <h3 className="mt-2 text-2xl font-black leading-tight">自事業所の情報を、<br />CareSpaceOSから更新</h3>
          <p className="mt-3 text-sm font-semibold text-white/80">{facilityName}</p>
          {jigyoshoNumber && <p className="mt-1 text-xs text-white/50">事業所番号 {jigyoshoNumber}</p>}
        </div>

        <div className="p-6">
          <p className="text-sm leading-7 text-slate-600">
            登録済みの方は、CareSpace OSの「経営支援 → Cares掲載管理」へお進みください。未登録の場合は、事業所登録・確認後にこのページとつながります。
          </p>

          <div className="mt-5 space-y-3">
            {[
              [BadgeCheck, '事業所公式の空き状況をすぐ更新'],
              [ShieldCheck, '公表データと登録事業所を自動照合'],
              [Building2, '写真・料金・パンフレット・問い合わせを一元管理'],
            ].map(([Icon, text]) => (
              <div key={text as string} className="flex items-center gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-slate-700">
                <Icon className="h-4 w-4 shrink-0 text-cares-600" />
                <span>{text as string}</span>
              </div>
            ))}
          </div>

          <a href={CARESPACE_MANAGEMENT_URL} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-cares-600 px-4 py-3.5 text-base font-black text-white shadow-lg shadow-cares-200 transition hover:bg-cares-700">
            登録済み：OSで掲載管理を開く
            <ArrowRight className="h-5 w-5" />
          </a>
          <a href={signupUrl} className="mt-3 block text-center text-sm font-bold text-cares-700 hover:text-cares-800">
            未登録：事業所の登録を始める
          </a>
          <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">
            掲載情報の編集には該当事業所の管理権限が必要です。Caresへの利用者登録だけでは編集できません。
          </p>
        </div>
      </div>
    </div>
  )
}
