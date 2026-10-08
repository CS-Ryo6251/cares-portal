import ServiceTypeOptions from '@/components/ServiceTypeOptions'
import type { Metadata } from 'next'
import { ArrowLeft, ArrowRight, Heart } from 'lucide-react'
import FacilityListCard from '@/components/FacilityListCard'
import PrefectureRankingMap from '@/components/PrefectureRankingMap'
import { prefectures } from '@/lib/constants'
import { rankingFilters, rankingUrl } from '@/lib/support-ranking'
import { getSupportRanking } from '@/lib/support-ranking-server'

export const metadata: Metadata = {
  title: '応援ランキング — Cares by CareSpace',
  description: '地域からの応援が集まる介護事業所をご紹介。今週・累計の応援ハートを、都道府県やサービス別に見られます。',
  alternates: { canonical: '/ranking' },
}

const date = (value: string) => new Date(value).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export default async function RankingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = rankingFilters(await searchParams)
  const ranking = await getSupportRanking(filters)
  const label = filters.period === 'week' ? '今週' : '累計'

  return <div className="min-h-screen bg-[#fffcf9]">
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <a href={filters.prefecture ? rankingUrl({ ...filters, prefecture: '' }) : '/'} className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-500 hover:text-[#805f63]"><ArrowLeft className="h-4 w-4" />{filters.prefecture ? '全国の応援マップへ' : '事業所をさがす'}</a>
      <div className="mt-5 border-b border-stone-200 pb-8 sm:mt-8 sm:pb-10">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#805f63]"><Heart className="h-4 w-4 fill-current" />地域の「いいね」が集まる場所</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{filters.prefecture ? `${filters.prefecture}の応援ランキング` : '全国の応援ランキング'}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">日々の発信や、事業所へのあたたかな応援。<br className="hidden sm:block" />あなたのまちで応援を集める事業所を、見つけてみませんか。</p>
      </div>

      <div className="my-7 flex rounded-full bg-[#f1ece7] p-1 sm:w-72" aria-label="集計期間">
        {(['week', 'all'] as const).map(period => <a key={period} href={rankingUrl({ ...filters, period })} aria-current={filters.period === period ? 'page' : undefined} className={`flex min-h-11 flex-1 items-center justify-center rounded-full text-sm font-bold ${filters.period === period ? 'bg-white text-[#805f63] shadow-sm' : 'text-slate-500 hover:text-[#805f63]'}`}>{period === 'week' ? '今週の応援' : '累計の応援'}</a>)}
      </div>

      <form action="/ranking" className="grid gap-3 rounded-2xl border border-[#eee6e2] bg-white p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end sm:p-5">
        <input type="hidden" name="period" value={filters.period} />
        <label className="min-w-0 text-xs font-semibold text-slate-600">エリア<select aria-label="エリア" name="prefecture" defaultValue={filters.prefecture} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800"><option value="">全国</option>{prefectures.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="min-w-0 text-xs font-semibold text-slate-600">サービス<select aria-label="サービス" name="service_type" defaultValue={filters.service} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800"><option value="">すべてのサービス</option><ServiceTypeOptions currentValue={filters.service} /></select></label>
        <button className="min-h-11 rounded-xl bg-slate-800 px-6 text-sm font-bold text-white hover:bg-slate-700">表示する</button>
      </form>

      {!filters.prefecture && <PrefectureRankingMap key={`${filters.period}-${filters.service}`} period={filters.period} service={filters.service} initialPrefecture={ranking?.items.find(item => item.prefecture && prefectures.some(prefecture => prefecture === item.prefecture))?.prefecture || ''} />}

      <div className="mb-4 mt-8 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">{filters.prefecture || '全国'}の{label}の応援</h2>
        {ranking && <p className="text-xs leading-6 text-slate-500">{date(ranking.asOf)} 時点<span className="ml-2">上位50事業所まで</span></p>}
      </div>
      {!ranking ? <div role="status" className="rounded-2xl border border-stone-200 bg-white p-7 text-center"><p className="font-semibold text-slate-700">ランキングを読み込めませんでした</p><a href={rankingUrl(filters)} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#805f63] underline underline-offset-4">もう一度読み込む</a></div>
        : ranking.items.length === 0 ? <div className="rounded-3xl border border-dashed border-stone-200 bg-white px-5 py-12 text-center"><Heart className="mx-auto h-8 w-8 text-[#b28d8b]" /><h3 className="mt-4 font-bold text-slate-800">{label}の応援を待っています</h3><p className="mt-3 text-sm leading-7 text-slate-500">この条件に合う事業所には、まだ応援がありません。<br />気になる事業所を見つけたら、ハートで気持ちを届けてみませんか。</p><a href={`/?${new URLSearchParams({ ...(filters.prefecture ? {area:filters.prefecture} : {}), ...(filters.service ? {service_type:filters.service} : {}) })}`} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#805f63]">事業所をさがす<ArrowRight className="h-4 w-4" /></a></div>
        : <ol className="space-y-3">{ranking.items.map(item => <li key={item.id}>
          <FacilityListCard id={item.id} name={item.name} serviceType={item.serviceType} address={item.address} coverImage={item.coverImage} overview={item.overview} total={item.total} rank={item.rank} supportLabel={`${label}の応援ハート`} />
        </li>)}</ol>}

      <div className="mt-8 border-t border-[#eee6e2] pt-5 text-xs leading-6 text-slate-500">
        <p>事業所への応援と、公開中の投稿への「いいね」を合算しています。同じ事業所の複数掲載は1つにまとめ、同数は同じ順位で表示します。</p>
        <p className="mt-2">応援ハートは何度でも送れます。人数や介護サービスの質を示す評価ではありません。</p>
        <p className="mt-2">今週は月曜日0:00から（日本時間）。{ranking?.periodStart && `${date(ranking.periodStart)}〜。`}表示への反映には1分ほどかかることがあります。投稿のいいねを取り消したり、投稿が非公開になると、その分は集計から外れます。</p>
      </div>
    </div>
  </div>
}
