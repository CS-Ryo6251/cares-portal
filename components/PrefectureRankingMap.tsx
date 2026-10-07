'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Heart, MapPin, MousePointer2, RefreshCw, Trophy } from 'lucide-react'
import { prefectures } from '@/lib/constants'
import { compactHearts, formatHearts } from '@/lib/community'
import { mapRegions, prefectureTiles } from '@/lib/prefecture-map'
import { rankingUrl, readSupportRanking, type RankingFilters, type SupportRanking } from '@/lib/support-ranking'

type Props = { period: RankingFilters['period']; service: string; initialPrefecture: string }
type Result = { key: string; data: SupportRanking | null; error: boolean }

export default function PrefectureRankingMap({ period, service, initialPrefecture }: Props) {
  const [selected, setSelected] = useState(initialPrefecture)
  const [result, setResult] = useState<Result | null>(null)
  const [retry, setRetry] = useState(0)
  const cache = useRef(new Map<string, { data: SupportRanking; expires: number }>())
  const lastPointer = useRef('mouse')
  const panelRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const key = JSON.stringify([period, service, selected])
  const label = period === 'week' ? '今週' : '累計'
  const data = result?.key === key ? result.data : null
  const error = result?.key === key && result.error
  const loading = Boolean(selected && !data && !error)
  const url = rankingUrl({ period, service, prefecture: selected })

  function revealPanel() {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      panelRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    }
  }

  useEffect(() => {
    if (!selected) return
    const cached = cache.current.get(key)
    if (cached && cached.expires > Date.now()) {
      setResult({ key, data: cached.data, error: false })
      return
    }
    const controller = new AbortController()
    let active = true
    setResult(null)
    const timeout = setTimeout(() => controller.abort(), 12000)
    // Briefly crossing another tile should not start an extra server aggregation.
    const debounce = setTimeout(() => {
      const query = new URLSearchParams({ period, prefecture: selected, ...(service ? { service_type: service } : {}) })
      fetch(`/api/ranking/prefecture?${query}`, { signal: controller.signal })
        .then(async response => {
          if (!response.ok) throw new Error('Ranking unavailable')
          const body = await response.json()
          const ranking = readSupportRanking(body)
          if (!ranking || ranking.period !== period || body.prefecture !== selected || ranking.items.length > 3
            || ranking.items.some(item => item.prefecture !== selected || (service && item.serviceType !== service))) throw new Error('Invalid ranking')
          if (!active) return
          cache.current.set(key, { data: ranking, expires: Date.now() + 60000 })
          setResult({ key, data: ranking, error: false })
        })
        .catch(() => { if (active) setResult({ key, data: null, error: true }) })
        .finally(() => clearTimeout(timeout))
    }, 120)
    return () => { active = false; clearTimeout(debounce); clearTimeout(timeout); controller.abort() }
  }, [key, period, selected, service, retry])

  return <section aria-labelledby="ranking-map-title" className="my-8 overflow-hidden rounded-3xl border border-[#e7e3db] bg-white">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 px-5 py-6 sm:px-7">
      <div><p className="text-xs font-semibold tracking-[.16em] text-[#788772]">HEARTS ACROSS JAPAN</p><h2 id="ranking-map-title" className="mt-2 text-xl font-bold text-stone-800 sm:text-2xl">あなたのまちの、応援を見つけよう。</h2><p id="ranking-map-help" className="mt-2 text-sm leading-6 text-stone-500">県にカーソルを合わせると上位3事業所、クリックすると県のランキングへ。<span className="block">スマホでは県をタップして、応援のようすを見られます。</span></p></div>
      <span className="rounded-full bg-[#f2f4ee] px-3 py-1.5 text-xs font-semibold text-[#526b58]">47都道府県</span>
    </div>

    <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
      <div ref={mapRef} className="min-w-0 scroll-mt-32 border-b border-stone-100 bg-[#fcfaf7] p-5 sm:p-7 lg:order-2 lg:border-b-0 lg:border-l">
        <label className="flex flex-wrap items-center gap-3 text-xs font-semibold text-stone-600"><MapPin aria-hidden="true" className="h-4 w-4" />都道府県を選ぶ<select aria-label="地図で見る都道府県" value={selected} onChange={event => { setSelected(event.target.value); if (event.target.value) revealPanel() }} className="min-h-11 flex-1 rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal text-stone-800"><option value="">選択してください</option>{prefectures.map(prefecture => <option key={prefecture}>{prefecture}</option>)}</select></label>
        <svg viewBox="0 0 636 562" role="group" aria-label="都道府県から応援ランキングを選ぶ日本地図" aria-describedby="ranking-map-help" className="mt-3 w-full overflow-visible">
          <text x="46" y="134" fill="#8b9688" fontSize="13" letterSpacing="4" aria-hidden="true">JAPAN</text>
          <path d="M9 489h101l22 24" fill="none" stroke="#d4d3cb" strokeDasharray="5 5" aria-hidden="true" />
          {prefectureTiles.map(tile => {
            const active = selected === tile.prefecture
            const x = 6 + tile.x * 48, y = 6 + tile.y * 48, width = tile.width * 48 - 4, height = tile.height * 48 - 4
            return <a key={tile.prefecture} href={rankingUrl({ period, service, prefecture: tile.prefecture })} aria-label={`${tile.prefecture}の応援ランキング`} data-prefecture={tile.prefecture} data-selected={active} className="group outline-none"
              onPointerEnter={event => { if (event.pointerType !== 'touch') setSelected(tile.prefecture) }}
              onPointerDown={event => { lastPointer.current = event.pointerType }}
              onFocus={() => setSelected(tile.prefecture)}
              onClick={event => {
                if (lastPointer.current === 'touch' && event.detail !== 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); setSelected(tile.prefecture); revealPanel() }
              }}>
              <rect x={x} y={y} width={width} height={height} rx="6" fill={active ? '#607a64' : mapRegions[tile.region].fill} stroke={active ? '#45634c' : '#ffffff'} strokeWidth="2" className="transition-colors group-focus-visible:stroke-stone-800 group-focus-visible:[stroke-width:3]" />
              <text x={x + width / 2} y={y + height / 2} dominantBaseline="central" textAnchor="middle" fontSize={tile.prefecture === '北海道' ? 16 : tile.label.length === 3 ? 11 : 12} fontWeight={active ? 700 : 500} fill={active ? '#ffffff' : '#4e554d'} pointerEvents="none">{tile.label}</text>
            </a>
          })}
        </svg>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2" aria-label="地方の色分け">{mapRegions.map(region => <span key={region.label} className="inline-flex items-center gap-1.5 text-[10px] text-stone-500"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: region.fill }} />{region.label}</span>)}</div>
        <p className="mt-3 text-[10px] leading-5 text-stone-400">見やすく簡略化した地図です。色は地方を表し、順位やハート数を表すものではありません。</p>
      </div>

      <div ref={panelRef} aria-label="選択した都道府県の上位3事業所" className="flex min-w-0 scroll-mt-32 flex-col p-5 sm:p-7 lg:order-1">
        {!selected ? <div className="flex flex-1 flex-col items-start justify-center py-8"><span className="rounded-2xl bg-[#f2f4ee] p-4 text-[#607a64]"><MousePointer2 aria-hidden="true" className="h-7 w-7" /></span><h3 className="mt-5 text-xl font-bold leading-8 text-stone-800">気になる県に、<br />ふれてみてください。</h3><p className="mt-3 text-sm leading-7 text-stone-500">地域で応援を集めている事業所と、<br />そこに届いたハートをご紹介します。</p></div> : <>
          <p className="flex items-center gap-2 text-xs font-semibold text-[#805f63]"><Trophy aria-hidden="true" className="h-4 w-4" />{label}の応援ランキング</p>
          <h3 className="mt-2 text-3xl font-bold text-stone-800">{selected}</h3>
          <p className="mt-2 text-xs leading-5 text-stone-500">{service || 'すべてのサービス'} · 上位3事業所</p>
          <div aria-live="polite" aria-busy={loading} className="my-5 flex-1">
            {loading ? <div role="status" className="space-y-4 py-3"><p className="text-xs text-stone-500">{selected}の応援を読み込み中…</p>{[0, 1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-2xl bg-stone-100" />)}</div>
              : error ? <div role="alert" className="rounded-2xl bg-stone-50 p-4"><p className="text-sm leading-6 text-stone-600">ランキングを読み込めませんでした。</p><button onClick={() => { cache.current.delete(key); setResult(null); setRetry(value => value + 1) }} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#805f63] underline"><RefreshCw aria-hidden="true" className="h-4 w-4" />もう一度読み込む</button></div>
                : data?.items.length === 0 ? <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-7"><Heart aria-hidden="true" className="h-7 w-7 text-[#b28d8b]" /><p className="mt-3 text-sm font-semibold text-stone-700">{label}の応援を待っています</p><p className="mt-2 text-xs leading-6 text-stone-500">この条件に合う事業所には、まだ応援がありません。</p></div>
                  : <ol className="divide-y divide-stone-100">{data?.items.map(item => <li key={item.id} className="py-4 first:pt-0"><a href={`/directory/${item.id}`} className="group flex min-h-11 items-start gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#607a64]"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${item.rank === 1 ? 'bg-[#eee5cd] text-[#75613a]' : 'bg-[#f0eeeb] text-stone-600'}`} aria-label={`${item.rank}位`}>{item.rank}</span><div className="min-w-0 flex-1"><p className="break-words text-sm font-bold leading-6 text-stone-800 group-hover:text-[#805f63]">{item.name}</p><p title={formatHearts(item.total)} aria-label={`${formatHearts(item.total)}ハート`} className="mt-2 flex items-center gap-1.5 text-lg font-bold tabular-nums text-[#805f63]"><Heart aria-hidden="true" className="h-3.5 w-3.5 fill-[#b28d8b] text-[#b28d8b]" />{compactHearts(item.total)}<span className="text-[10px] font-normal text-stone-500">ハート</span></p></div></a></li>)}</ol>}
          </div>
          {data && <p className="mb-4 text-[10px] leading-5 text-stone-500">{new Date(data.asOf).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 時点 · 同数は同順位で、最大3事業所を表示</p>}
          <a href={url} className="inline-flex min-h-12 items-center justify-between gap-2 rounded-xl bg-[#607a64] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4f6753]">{selected}のランキングを見る<ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" /></a>
          <button onClick={() => mapRef.current?.scrollIntoView({ block: 'start' })} className="mt-2 min-h-11 text-xs font-semibold text-stone-500 underline underline-offset-4 lg:hidden">地図に戻って、ほかの県を見る</button>
        </>}
      </div>
    </div>
  </section>
}
