import { ArrowRight, BadgeCheck, Heart } from 'lucide-react'
import FacilityAddressLink from './FacilityAddressLink'
import FacilityListCover from './FacilityListCover'
import AddToListButton from './AddToListButton'
import { compactHearts, formatHearts } from '@/lib/community'
import { facilityTypeLabels, vacancyStatusMap } from '@/lib/constants'

type Props = {
  id: string; name: string; serviceType: string | null; address: string | null
  coverImage?: string | null; overview?: string | null; total: string | null | undefined
  supportLabel?: string; rank?: number; isOfficial?: boolean
  acceptanceStatus?: string | null; distanceKm?: number | null
}

export default function FacilityListCard({ id, name, serviceType, address, coverImage = null, overview, total, supportLabel = '応援ハート', rank, isOfficial, acceptanceStatus, distanceKm }: Props) {
  const status = acceptanceStatus ? vacancyStatusMap[acceptanceStatus] : null
  const exact = formatHearts(total)
  const countLabel = exact === '—' ? '応援数を取得できません' : `${exact} ハート`

  return <article className="overflow-hidden rounded-2xl border border-[#eee6e2] bg-white"><div className="group relative grid grid-cols-[76px_minmax(0,1fr)] gap-4 bg-white p-4 transition hover:border-rose-200 hover:shadow-sm sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:p-5">
    <div className="relative h-24 overflow-hidden rounded-xl bg-rose-50 sm:h-28">
      <FacilityListCover src={coverImage} />
      {rank !== undefined && <span className="absolute left-0 top-0 flex h-9 min-w-9 items-center justify-center rounded-br-xl bg-white/95 px-2 text-lg font-bold tabular-nums text-rose-700" aria-label={`${rank}位`}>{rank}</span>}
    </div>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        {serviceType && <span>{facilityTypeLabels[serviceType] || serviceType}</span>}
        {isOfficial === true && <span className="inline-flex items-center gap-1 text-rose-600"><BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />公式</span>}
        {isOfficial === false && <span className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px]">公表DB</span>}
      </div>
      <h3 className="mt-1.5 break-words text-base font-bold leading-6 text-slate-900 group-hover:text-rose-700 sm:text-lg"><a href={`/directory/${id}`} data-facility-card={id} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-slate-500">{name}</a></h3>
      {address && <div className="mt-2 text-xs leading-5"><FacilityAddressLink name={name} address={address} /></div>}
      {(status || (typeof distanceKm === 'number' && Number.isFinite(distanceKm))) && <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
        {status && <span className={`inline-flex rounded-full px-2 py-1 font-semibold ${status.color}`}>{status.label}</span>}
        {typeof distanceKm === 'number' && Number.isFinite(distanceKm) && <span className="text-slate-500">現在地から約{distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}</span>}
      </div>}
      {overview && <p className="mt-2 hidden text-xs leading-6 text-slate-500 sm:line-clamp-2">{overview}</p>}
    </div>
    <div className="col-start-2 sm:col-start-auto sm:text-right">
      <p className="text-[10px] text-slate-500">{supportLabel}</p>
      <p className="mt-1 flex items-center gap-2 font-bold text-rose-600 sm:justify-end" title={countLabel} aria-label={countLabel}><Heart aria-hidden="true" className="h-5 w-5 shrink-0 fill-current" /><span aria-hidden="true" className="text-2xl tabular-nums">{compactHearts(total)}</span></p>
      <span className="mt-2 hidden items-center gap-1 text-xs font-semibold text-slate-500 sm:inline-flex">ページを見る<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></span>
    </div>
  </div><div className="flex justify-end border-t border-slate-100 px-4 py-2"><AddToListButton listingId={id} name={name} /></div></article>
}
