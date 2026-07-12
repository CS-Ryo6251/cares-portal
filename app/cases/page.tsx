import type { Metadata } from 'next'
import {
  ArrowRight,
  BadgeJapaneseYen,
  Building2,
  CalendarDays,
  HeartHandshake,
  LockKeyhole,
  MapPin,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { getPublicServiceCases } from '@/lib/service-cases'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '地域の支援案件',
  description: '地域の介護事業所が募集している支援案件を、依頼元を伏せた安心設計で確認できます。仲介手数料・成約手数料はかかりません。',
  alternates: { canonical: '/cases' },
}

const SERVICE_TYPES = [
  '居宅介護支援', '訪問介護', '訪問看護', '訪問入浴介護',
  '通所介護', '地域密着型通所介護', '通所リハビリテーション',
  '短期入所生活介護', '介護老人福祉施設', '介護老人保健施設',
  '認知症対応型共同生活介護', '小規模多機能型居宅介護',
]

const CASE_TYPE_LABELS = {
  searchUsers: '受入先を探しています',
  dischargeCoordination: '退院調整',
  searchCareManager: 'ケアマネ調整',
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '掲載日未設定'
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; area?: string; service_type?: string }>
}) {
  const params = await searchParams
  const { cases, unavailable } = await getPublicServiceCases({
    q: params.q,
    area: params.area,
    serviceType: params.service_type,
  })

  return (
    <div className="min-h-screen">
      <section className="border-b border-rose-100 bg-white/70">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 ring-1 ring-rose-100">
                <HeartHandshake className="h-4 w-4" />地域でつなぐ支援案件
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                必要な支援と、<br className="sm:hidden" />応えられる事業所をつなぐ。
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                CareSpaceOSを利用する事業所から共有された案件です。依頼元の事業所名や個人を特定する情報は公開せず、地域と必要なサービスだけで探せます。
              </p>
            </div>
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
              <div className="flex items-center gap-2 font-black"><BadgeJapaneseYen className="h-5 w-5" />仲介手数料・成約手数料 0円</div>
              <p className="mt-2 text-xs leading-6 text-emerald-800">Cares / CareSpaceOSは情報共有の場です。相談や契約は事業所間で直接行います。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <form className="surface-card grid gap-3 rounded-3xl p-4 sm:grid-cols-[1fr_12rem_13rem_auto] sm:p-5" action="/cases">
          <label className="relative">
            <span className="sr-only">案件名・キーワード</span>
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={params.q || ''} placeholder="案件名・キーワード" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-cares-400 focus:ring-2 focus:ring-rose-100" />
          </label>
          <label>
            <span className="sr-only">対象地域</span>
            <input name="area" defaultValue={params.area || ''} placeholder="都道府県・市区町村" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cares-400 focus:ring-2 focus:ring-rose-100" />
          </label>
          <label>
            <span className="sr-only">サービス種別</span>
            <select name="service_type" defaultValue={params.service_type || ''} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cares-400 focus:ring-2 focus:ring-rose-100">
              <option value="">すべてのサービス</option>
              {SERVICE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <button className="h-12 rounded-xl bg-cares-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-cares-700">検索する</button>
        </form>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">募集中の案件</h2>
            <p className="mt-1 text-xs text-slate-500">公開に同意された案件のみ掲載しています</p>
          </div>
          {!unavailable && <p className="text-sm font-bold text-slate-500">{cases.length}件</p>}
        </div>

        {unavailable ? (
          <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
            <p className="font-bold text-amber-900">現在、案件情報を読み込めません</p>
            <p className="mt-2 text-sm text-amber-700">時間をおいて、もう一度お試しください。</p>
          </div>
        ) : cases.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <HeartHandshake className="mx-auto h-10 w-10 text-rose-300" />
            <p className="mt-4 font-bold text-slate-800">該当する公開案件はまだありません</p>
            <p className="mt-2 text-sm text-slate-500">条件を変えて検索するか、時間をおいてご確認ください。</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {cases.map(item => (
              <article key={item.id} className="card-lift overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">{CASE_TYPE_LABELS[item.caseType] || '支援案件'}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400"><CalendarDays className="h-3.5 w-3.5" />{formatDate(item.createdAt)}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-black leading-7 text-slate-950">{item.title}</h3>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-slate-700"><MapPin className="h-4 w-4 text-cares-500" />{item.area}</p>
                </div>
                <div className="px-5 py-5 sm:px-6">
                  <div className="flex flex-wrap gap-2">
                    {item.serviceTypes.map(type => <span key={type} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700">{type}</span>)}
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3"><dt className="flex items-center gap-1 text-[10px] font-bold text-slate-400"><UserRound className="h-3.5 w-3.5" />対象者</dt><dd className="mt-1 text-sm font-bold text-slate-800">{item.clientSummary || '概要未設定'}</dd></div>
                    <div className="rounded-xl bg-slate-50 p-3"><dt className="text-[10px] font-bold text-slate-400">要介護度</dt><dd className="mt-1 text-sm font-bold text-slate-800">{item.careLevel || '未選択・申請中'}</dd></div>
                  </dl>
                  <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500"><LockKeyhole className="h-4 w-4 text-slate-400" />依頼元事業所と案件詳細は非公開です</div>
                  <a href="https://app.carespace.jp/signup/new-organization?source=cares&intent=service-case" className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-cares-600 px-4 py-3 text-sm font-black text-white transition hover:bg-cares-700">詳細を確認・連絡する<ArrowRight className="h-4 w-4" /></a>
                  <p className="mt-2 text-center text-[11px] text-slate-400">CareSpaceOSへの事業所登録が必要です</p>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-4 rounded-3xl border border-rose-100 bg-white p-6 shadow-sm sm:grid-cols-3">
          <div><ShieldCheck className="h-6 w-6 text-cares-500" /><p className="mt-2 text-sm font-black text-slate-900">匿名の公開情報</p><p className="mt-1 text-xs leading-5 text-slate-500">依頼元、詳細本文、医療・生活上の留意点は公開しません。</p></div>
          <div><Building2 className="h-6 w-6 text-cares-500" /><p className="mt-2 text-sm font-black text-slate-900">事業所間で直接相談</p><p className="mt-1 text-xs leading-5 text-slate-500">登録後はCareSpaceOSで案件を確認し、依頼元へ直接連絡できます。</p></div>
          <div><BadgeJapaneseYen className="h-6 w-6 text-cares-500" /><p className="mt-2 text-sm font-black text-slate-900">仲介・成約手数料なし</p><p className="mt-1 text-xs leading-5 text-slate-500">案件の閲覧や成約に応じた手数料は発生しません。</p></div>
        </div>
      </section>
    </div>
  )
}
