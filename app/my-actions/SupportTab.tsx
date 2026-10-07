'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Building2, CalendarDays, Heart, LockKeyhole, RefreshCw, Search, Sparkles } from 'lucide-react'
import { formatHearts } from '@/lib/community'
import { supportDate, supportPercent, type SupportHistory, type SupportPeriod } from '@/lib/my-support'
import { facilityTypeLabels } from '@/lib/constants'

const PERIODS: { value: SupportPeriod; label: string }[] = [{ value: '30d', label: '30日間' }, { value: '90d', label: '90日間' }, { value: 'all', label: 'すべて' }]

function SupportTimeline({ data }: { data: SupportHistory }) {
  const [selected, setSelected] = useState(data.timeline.length - 1)
  const maximum = data.timeline.reduce((max, point) => BigInt(point.count) > BigInt(max) ? point.count : max, '1')
  const coordinates = data.timeline.map((point, index) => ({ ...point, x: data.timeline.length === 1 ? 300 : 12 + index * 576 / (data.timeline.length - 1), y: 148 - supportPercent(point.count, maximum) * 1.24 }))
  const path = coordinates.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ')
  const point = coordinates[Math.min(selected, coordinates.length - 1)]
  return <section aria-labelledby="support-timeline-title" className="min-w-0 rounded-3xl border border-rose-100 bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h2 id="support-timeline-title" className="font-bold text-slate-900">応援の歩み</h2><p className="mt-1 text-xs text-slate-500">{data.unit === 'month' ? '月ごと' : '日ごと'}に届けたハート</p></div>
      <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">最多 {formatHearts(maximum === '1' && data.total === '0' ? '0' : maximum)} / {data.unit === 'month' ? '月' : '日'}</span>
    </div>
    <svg viewBox="0 0 600 174" role="img" aria-label={`${data.unit === 'month' ? '月別' : '日別'}の応援推移。合計${formatHearts(data.total)}ハート。下の日付選択から各値を確認できます。`} className="mt-7 h-44 w-full overflow-visible">
      <defs><linearGradient id="support-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#e11d48" stopOpacity=".23" /><stop offset="1" stopColor="#e11d48" stopOpacity=".02" /></linearGradient></defs>
      {[24, 86, 148].map(y => <line key={y} x1="12" x2="588" y1={y} y2={y} stroke="#f1e8eb" strokeDasharray="4 5" />)}
      {coordinates.length > 0 && <><path d={`${path} L${coordinates[coordinates.length - 1].x},148 L${coordinates[0].x},148 Z`} fill="url(#support-chart-fill)" /><path d={path} fill="none" stroke="#e11d48" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" /></>}
      {coordinates.map((p, i) => <circle key={p.date} cx={p.x} cy={p.y} r={i === selected ? 5 : 3} fill={i === selected ? '#9f1239' : '#fb7185'}><title>{supportDate(p.date, data.unit === 'month')}：{formatHearts(p.count)}ハート</title></circle>)}
      {point && <circle cx={point.x} cy={point.y} r="9" fill="none" stroke="#fda4af" strokeWidth="2" />}
    </svg>
    <div className="flex justify-between text-[11px] text-slate-500"><span>{supportDate(data.timeline[0]?.date || data.asOf, data.unit === 'month')}</span><span>{supportDate(data.asOf, data.unit === 'month')}</span></div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-50/70 p-3">
      <label className="text-xs text-slate-600">{data.unit === 'month' ? '月' : '日付'}を選ぶ<select aria-label="グラフの日付" value={selected} onChange={event => setSelected(Number(event.target.value))} className="ml-2 min-h-10 max-w-full rounded-lg border border-rose-100 bg-white px-2 text-sm text-slate-800">{data.timeline.map((p, i) => <option key={p.date} value={i}>{supportDate(p.date, data.unit === 'month')}</option>)}</select></label>
      <p aria-live="polite" className="text-sm font-bold text-rose-700">♡ {formatHearts(point?.count || '0')}</p>
    </div>
  </section>
}

export default function SupportTab() {
  const [period, setPeriod] = useState<SupportPeriod>('30d')
  const [data, setData] = useState<SupportHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [needsLogin, setNeedsLogin] = useState(false)
  const [retry, setRetry] = useState(0)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('hearts')
  const [visible, setVisible] = useState(6)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    let active = true
    setLoading(true); setError(''); setNeedsLogin(false); setData(null); setVisible(6)
    fetch(`/api/my-actions/support?period=${period}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const body = await response.json()
        if (!active) return
        if (response.status === 401) setNeedsLogin(true)
        if (!response.ok) throw new Error(body.error || '応援の記録を読み込めませんでした')
        setData(body)
      })
      .catch(reason => { if (active) setError(reason instanceof Error && reason.name !== 'AbortError' ? reason.message : '読み込みに時間がかかっています。もう一度お試しください') })
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false) })
    return () => { active = false; clearTimeout(timeout); controller.abort() }
  }, [period, retry])

  useEffect(() => {
    const refresh = () => setRetry(value => value + 1)
    window.addEventListener('cares:heart-sent', refresh)
    window.addEventListener('focus', refresh)
    return () => { window.removeEventListener('cares:heart-sent', refresh); window.removeEventListener('focus', refresh) }
  }, [])

  const facilities = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ja')
    return [...(data?.facilities || [])].filter(f => `${f.name} ${f.address || ''}`.toLocaleLowerCase('ja').includes(query)).sort((a, b) => sort === 'recent' ? b.lastSentAt.localeCompare(a.lastSentAt) : BigInt(a.count) === BigInt(b.count) ? a.name.localeCompare(b.name, 'ja') : BigInt(a.count) > BigInt(b.count) ? -1 : 1)
  }, [data, search, sort])

  return <div className="space-y-5 sm:space-y-6">
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-950 via-rose-900 to-rose-700 p-6 text-white sm:p-8">
      <Heart aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 h-48 w-48 rotate-12 fill-white/5 text-white/5" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-semibold text-rose-100"><Sparkles aria-hidden="true" className="h-4 w-4" />あなたの「いいね」が、地域の力に。</p>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">届けた応援が、ここに残る。</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-rose-100">いつ、どの事業所を応援したか。<br className="sm:hidden" />あなたのつながりを、少しずつ育てましょう。</p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-rose-100"><LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />この記録は、あなただけに表示されます。</p>
        </div>
        <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-1 md:block md:border-l md:border-white/20 md:pl-8"><span className="break-all text-4xl font-extrabold tabular-nums sm:text-5xl">{data ? formatHearts(data.lifetimeTotal) : '—'}</span><span className="pb-1 text-sm text-rose-100 md:mt-2 md:block">累計ハート</span></div>
      </div>
    </section>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label="集計期間" className="flex rounded-full border border-rose-100 bg-white p-1">{PERIODS.map(option => <button key={option.value} aria-pressed={period === option.value} onClick={() => setPeriod(option.value)} className={`min-h-10 rounded-full px-4 text-sm font-semibold ${period === option.value ? 'bg-rose-700 text-white shadow-sm' : 'text-slate-600 hover:bg-rose-50'}`}>{option.label}</button>)}</div>
      <button onClick={() => setRetry(value => value + 1)} disabled={loading} className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40"><RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${loading ? 'motion-safe:animate-spin' : ''}`} />更新</button>
    </div>

    {loading ? <div role="status" aria-label="応援の記録を読み込み中" className="grid animate-pulse gap-4 sm:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-28 rounded-2xl bg-white" />)}<div className="h-64 rounded-3xl bg-white sm:col-span-3" /></div> : error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-6"><p className="text-sm leading-6 text-slate-700">{error}</p>{needsLogin ? <Link href="/login?redirect=%2Fmy-actions" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-rose-700 underline">ログインして記録を見る</Link> : <button onClick={() => setRetry(value => value + 1)} className="mt-3 min-h-11 text-sm font-bold text-rose-700 underline">もう一度読み込む</button>}</div> : data && <>
      <p className="text-xs text-slate-500">{data.from ? `${supportDate(data.from)}〜${supportDate(data.asOf)}` : '記録の開始から今日まで'}・日本時間</p>
      <div className="grid grid-cols-3 gap-2 sm:gap-4">{[
        { label: '届けたハート', value: formatHearts(data.total), unit: '', icon: Heart },
        { label: '応援した事業所', value: data.facilityCount.toLocaleString('ja-JP'), unit: 'か所', icon: Building2 },
        { label: '応援した日', value: data.activeDays.toLocaleString('ja-JP'), unit: '日', icon: CalendarDays },
      ].map(({ label, value, unit, icon: Icon }) => <div key={label} className="min-w-0 rounded-2xl border border-rose-100 bg-white p-3 sm:p-5"><Icon aria-hidden="true" className="mb-3 h-5 w-5 text-rose-500" /><p className="break-all text-2xl font-extrabold tabular-nums text-slate-900 sm:text-3xl">{value}<span className="ml-1 text-[10px] font-medium text-slate-500 sm:text-xs">{unit}</span></p><p className="mt-2 text-[10px] leading-4 text-slate-500 sm:text-xs">{label}</p></div>)}</div>

      {data.total === '0' ? <section className="rounded-3xl border border-dashed border-rose-200 bg-white px-5 py-10 text-center"><Heart aria-hidden="true" className="mx-auto h-10 w-10 text-rose-300" /><h2 className="mt-4 text-lg font-bold">{data.lifetimeTotal === '0' ? '最初の応援から、はじめましょう。' : 'この期間の応援は、まだありません。'}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{data.lifetimeTotal === '0' ? '気になる事業所の「応援する」を押すと、あなたのグラフと履歴が育ちます。' : '「すべて」に切り替えると、これまでの応援を振り返れます。'}</p><Link href="/" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-rose-700 px-5 text-sm font-bold text-white">応援する事業所をさがす<ArrowRight className="h-4 w-4" /></Link></section> : <>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <SupportTimeline key={`${period}-${data.asOf}`} data={data} />
          <section aria-labelledby="support-breakdown-title" className="min-w-0 rounded-3xl border border-rose-100 bg-white p-5 sm:p-6"><h2 id="support-breakdown-title" className="font-bold text-slate-900">あなたの応援、どこへ届いた？</h2><p className="mt-1 text-xs text-slate-500">ハートが多い事業所・上位5か所</p><div className="mt-6 space-y-5">{data.facilities.slice(0, 5).map((f, i) => <div key={f.id}><div className="mb-2 flex items-baseline justify-between gap-3"><Link href={`/directory/${f.id}`} className="min-w-0 break-words text-sm font-semibold text-slate-700 hover:text-rose-700">{f.name}</Link><span className="shrink-0 text-sm font-bold tabular-nums text-rose-700">{formatHearts(f.count)}<span className="ml-1 text-[10px] font-normal">♡</span></span></div><div role="img" aria-label={`${f.name}：全体の${supportPercent(f.count, data.total)}%`} className="h-2.5 overflow-hidden rounded-full bg-rose-50"><div className={`h-full rounded-full ${['bg-rose-600', 'bg-rose-400', 'bg-orange-300', 'bg-amber-300', 'bg-teal-300'][i]}`} style={{ width: `${supportPercent(f.count, data.total)}%` }} /></div></div>)}</div></section>
        </div>

        <section aria-labelledby="supported-facilities-title" className="rounded-3xl border border-rose-100 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="supported-facilities-title" className="font-bold text-slate-900">応援した事業所<span className="ml-2 text-sm font-normal text-slate-500">{data.facilityCount}か所</span></h2><label className="text-xs text-slate-500">並び順<select aria-label="事業所の並び順" value={sort} onChange={e => setSort(e.target.value)} className="ml-2 min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"><option value="hearts">ハートが多い順</option><option value="recent">最近応援した順</option></select></label></div>
          <label className="mt-4 flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3"><Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" /><input aria-label="応援した事業所を検索" value={search} onChange={e => { setSearch(e.target.value); setVisible(6) }} placeholder="事業所名・住所で検索" className="w-full min-w-0 bg-transparent py-3 text-sm outline-none focus:ring-2 focus:ring-rose-300" /></label>
          <div className="mt-3 divide-y divide-rose-50">{facilities.slice(0, visible).map(f => <Link key={f.id} href={`/directory/${f.id}`} className="group flex items-center gap-3 py-4"><span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 sm:flex"><Building2 className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-bold text-slate-800 group-hover:text-rose-700">{f.name}</h3><p className="mt-1 break-words text-xs leading-5 text-slate-500">{f.serviceType ? facilityTypeLabels[f.serviceType] || f.serviceType : ''}{f.address ? ` · ${f.address}` : ''}</p><p className="mt-1 text-[11px] text-slate-400">最近の応援 {supportDate(f.lastSentAt)}</p></div><div className="shrink-0 text-right"><p className="text-sm font-extrabold tabular-nums text-rose-700">♡ {formatHearts(f.count)}</p><span className="mt-1 inline-flex items-center text-[11px] text-slate-500">見に行く<ArrowRight className="ml-1 h-3 w-3" /></span></div></Link>)}</div>
          {facilities.length === 0 && <p role="status" className="py-8 text-center text-sm text-slate-500">一致する事業所はありません。</p>}
          {facilities.length > visible && <button onClick={() => setVisible(value => value + 12)} className="mt-3 min-h-11 w-full rounded-xl border border-rose-100 text-sm font-bold text-rose-700">もっと見る（残り{facilities.length - visible}か所）</button>}
        </section>

        <section aria-labelledby="recent-support-title" className="rounded-3xl border border-rose-100 bg-white p-5 sm:p-6"><h2 id="recent-support-title" className="font-bold">最近届けた応援</h2><p className="mt-1 text-xs text-slate-500">選んだ期間の最新20件まで</p><ol className="mt-5 space-y-4">{data.recent.map(event => <li key={event.id} className="flex items-start gap-3"><span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-50"><Heart aria-hidden="true" className="h-3.5 w-3.5 fill-rose-400 text-rose-400" /></span><div className="min-w-0 flex-1"><Link href={`/directory/${event.listingId}`} className="break-words text-sm font-semibold text-slate-800 hover:text-rose-700">{event.name}</Link><p className="mt-1 text-xs text-slate-500">{new Date(event.at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div><span className="pt-1 text-sm font-bold text-rose-600">+1</span></li>)}</ol></section>
      </>}
      <details className="px-1 text-xs leading-6 text-slate-500"><summary className="min-h-11 cursor-pointer py-2">応援の記録について</summary><p>ログイン中に「いいね・応援する」から送ったハートを集計しています。ログイン前の応援や、会員向けの投稿いいねは含みません。日付は日本時間です。事業所の掲載情報が削除された場合、その事業所への記録も表示されなくなります。</p></details>
    </>}
  </div>
}
