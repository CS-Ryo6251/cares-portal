import { BadgeCheck, Building2, MapPin, Phone } from 'lucide-react'
import FacilityHearts from './FacilityHearts'
import AddToListButton from './AddToListButton'
import FacilityOwnerTools from './FacilityOwnerTools'
import FacilityProfileShare from './FacilityProfileShare'
import InquiryButton from '@/app/facility/[id]/InquiryButton'

type Props = {
  facilityId?: string; name: string; serviceType?: string | null; address?: string | null
  cover?: string | null; icon?: string | null; overview?: string | null; phone?: string | null
  statusLabel: string; statusColor: string; listingIds: string[]; postCount?: number | null; photoCount?: number
  isOfficial?: boolean; hasPublicProfile?: boolean
}
export default function FacilityProfileHeader(props: Props) {
  // A verified directory listing can exist before its owner publishes a profile.
  const publicFacilityId = props.hasPublicProfile === false ? undefined : props.facilityId
  const publicUrl = `https://cares.carespace.jp/${publicFacilityId ? `facility/${publicFacilityId}` : `directory/${props.listingIds[0]}`}`
  return <section className="overflow-hidden bg-white sm:rounded-3xl sm:border sm:border-slate-200/80" aria-label="事業所のプロフィール">
    <div className="relative h-32 overflow-hidden bg-[#f7e9e4] sm:h-72">
      {props.cover ? <img src={props.cover} alt={`${props.name}のカバー写真`} fetchPriority="high" className="h-full w-full object-cover" /> :
        <img src="/images/facility-cover-home.webp" alt="家と庭を描いたイラスト" width={2172} height={724} fetchPriority="high" className="h-full w-full object-cover object-center" />}
      {props.facilityId && <div className="absolute right-3 top-3 left-3 sm:right-5 sm:top-5"><FacilityOwnerTools facilityId={props.facilityId} /></div>}
    </div>
    <div className="px-5 pb-6 sm:px-8 sm:pb-8">
      <div className="relative flex items-end justify-between gap-3">
        <div className="-mt-10 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-[5px] border-white bg-rose-50 shadow-sm sm:-mt-12 sm:h-28 sm:w-28">
          {props.icon ? <img src={props.icon} alt={`${props.name}のアイコン`} className="h-full w-full object-cover" /> : <Building2 role="img" aria-label={`${props.name}のアイコン`} className="h-10 w-10 text-rose-500" />}
        </div>
        <div className="pb-1 pt-3"><FacilityProfileShare name={props.name} publicUrl={publicUrl} /></div>
      </div>
      <div className="mt-4 flex items-start gap-2">
        <h1 className="min-w-0 break-words text-2xl font-extrabold leading-snug tracking-tight text-slate-950 sm:text-3xl">{props.name}</h1>
        {props.isOfficial !== false && <BadgeCheck aria-label="事業所公式" className="mt-1.5 h-6 w-6 shrink-0 fill-rose-600 text-white" />}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <p className="font-medium text-slate-500">{props.serviceType}</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${props.statusColor}`}>{props.statusLabel}</span>
      </div>
      <div className="mt-3">
        <FacilityHearts listingId={props.listingIds[0]} facilityId={publicFacilityId} variant="profile" postCount={props.postCount} photoCount={props.photoCount} />
      </div>
      {props.overview && <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 sm:text-base">{props.overview}</p>}
      {props.address && <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-slate-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{props.address}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {props.listingIds[0] && <AddToListButton listingId={props.listingIds[0]} name={props.name} />}
        {publicFacilityId && <InquiryButton facilityId={publicFacilityId} facilityName={props.name} />}
        {props.phone && <a href={`tel:${props.phone}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700"><Phone className="h-4 w-4" />電話する</a>}
      </div>
    </div>
  </section>
}
