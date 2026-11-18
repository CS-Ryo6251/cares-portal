import { ArrowUpRight, MessageCircle } from 'lucide-react'
import type { ProviderAvailability } from '@/lib/provider-availability'
import { consultationEntryUrl } from '@/lib/cares-navigation'

export default function ProfessionalConsultation({ listingId, facilityName, availability }: {
  listingId: string; facilityName: string; availability?: ProviderAvailability | null
}) {
  const recruiting = Boolean(availability?.published && availability.recruitment_status === 'active'
    && availability.recruitment_post_id && ['has_vacancy', 'conditional'].includes(availability.status))
  return <section id="os-consultation" aria-label="ケアマネ・相談員の方へ" className="my-6 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 sm:p-7">
    <p className="text-sm font-bold text-emerald-800">ケアマネ・相談員の方へ</p>
    <h2 className="mt-2 flex items-center gap-2 text-lg font-bold text-slate-900"><MessageCircle className="h-5 w-5 shrink-0 text-emerald-700" />事業所との相談を、トークルームで</h2>
    <p className="mt-3 text-sm leading-7 text-slate-700">{recruiting
      ? `${facilityName}への相談をCareSpace OSで続けられます。所属事業所の確認後、空き情報を引き継いで連携し、受入れや日程を職員間で相談できます。`
      : 'CareSpace OSでは、地域の事業所を探し、サービス調整や事業所間の連携・トークルームを利用できます。'}</p>
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <a href={recruiting ? consultationEntryUrl(listingId) : 'https://app.carespace.jp/signup?source=cares'} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">
        {recruiting ? 'この事業所に相談する（CareSpace OS）' : '無料でCareSpace OSを始める'}<ArrowUpRight className="h-4 w-4 shrink-0" />
      </a>
      <a href={recruiting ? consultationEntryUrl(listingId, 'login') : 'https://app.carespace.jp/service'} className="inline-flex min-h-12 items-center justify-center px-3 text-sm font-bold text-emerald-900 underline underline-offset-4">共通アカウントでログイン</a>
    </div>
    <p className="mt-3 text-xs leading-6 text-slate-600">CaresとCareSpace OSは共通アカウントです。空き情報の閲覧に登録は不要です。OSは無料プランから利用できます。FAXなどの通信費は別途かかります。AI・業務機能を広げたいときは、OS内で有料プランを選べます。</p>
  </section>
}
