import { Phone } from 'lucide-react'
import FacilityAddressLink from './FacilityAddressLink'
import type { ListFacility, ListSnapshot } from '@/lib/personal-lists'
import FacilityListCover from './FacilityListCover'

export type SharedListData = ListSnapshot & { facilities: Record<string, ListFacility> }
export default function SharedListContent({ data }: { data: SharedListData }) {
  return <div className="shared-list-content">
    <h1 className="break-words text-2xl font-extrabold leading-snug text-slate-900 sm:text-3xl">{data.title}</h1>
    {data.intro && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{data.intro}</p>}
    <div className="mt-6 grid gap-5 sm:grid-cols-2">
      {data.entries.map((item, index) => {
        const facility = data.facilities[item.listing_id]
        return <article key={item.listing_id} className="break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {facility ? <>
            <div className="relative h-36 overflow-hidden bg-stone-50 print:hidden"><FacilityListCover src={facility.cover} /><span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white font-bold text-slate-700">{index + 1}</span></div>
            <div className="space-y-3 p-5"><p className="text-xs text-slate-500">{facility.service_type}</p><h2 className="break-words text-lg font-bold text-slate-900">{facility.name}</h2>
              {item.comment && <p className="whitespace-pre-wrap break-words rounded-xl bg-amber-50/70 p-3 text-sm leading-6 text-stone-700">{item.comment}</p>}
              {facility.address && <div className="text-xs leading-5"><FacilityAddressLink name={facility.name} address={facility.address} /></div>}
              {facility.phone && <a href={`tel:${facility.phone}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-slate-600"><Phone className="h-4 w-4" />{facility.phone}</a>}
              <a href={`/directory/${facility.id}`} referrerPolicy="no-referrer" className="flex min-h-11 items-center justify-center rounded-full bg-slate-800 px-4 text-sm font-bold text-white print:hidden">写真・空き状況・料金を見る</a>
            </div>
          </> : <p className="p-5 text-sm text-slate-500">{index + 1}. この事業所の掲載は現在確認できません。</p>}
        </article>
      })}
    </div>
  </div>
}
