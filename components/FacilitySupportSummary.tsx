import type { ReactNode } from 'react'
import { Heart } from 'lucide-react'
import type { FacilitySupport } from '@/lib/facility-support'

// Counts stay decimal strings from the database through display.
export function compactSupport(value: string) {
  const digits = value.replace(/^0+(?=\d)/, '')
  if (digits.length <= 4) return BigInt(digits).toLocaleString('ja-JP')
  const units = ['', '万', '億', '兆', '京', '垓', '秭', '穣', '溝', '澗', '正', '載', '極']
  const group = Math.floor((digits.length - 1) / 4)
  if (group >= units.length) return `${digits[0]}.${digits[1]} × 10^${digits.length - 1}`
  const whole = digits.slice(0, digits.length - group * 4)
  const decimal = digits[whole.length]
  return `${whole}${decimal !== '0' ? `.${decimal}` : ''}${units[group]}`
}

export default function FacilitySupportSummary({ support, facilityId, children }: { support: FacilitySupport; facilityId?: string; children?: ReactNode }) {
  const ready = support.status === 'ready' && support.total !== null && support.recent !== null
  const hasHearts = ready && support.total !== '0'
  return <div className="min-w-0 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:p-5">
    <p className="flex items-center gap-2 text-sm font-bold text-rose-800"><Heart className="h-5 w-5 shrink-0 fill-rose-500 text-rose-500" aria-hidden="true" />
      {ready ? hasHearts ? 'あなたの事業所に応援が届いています' : '最初の応援につながる、事業所の紹介を' : support.status === 'unlinked' ? '応援を事業所につなげましょう' : '応援を読み込めませんでした'}
    </p>
    {ready ? <>
      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="min-w-0"><p className="text-xs text-rose-800">応援ハートの合計</p>
          <p className="mt-1 break-all text-3xl font-bold tabular-nums text-rose-700" title={BigInt(support.total!).toLocaleString('ja-JP')} aria-label={`合計 ${support.total} ハート`}>{compactSupport(support.total!)}<span className="ml-1 text-sm font-medium">ハート</span></p>
        </div>
        <div className="min-w-0 rounded-xl bg-white px-3 py-2"><p className="text-xs text-gray-600">直近7日間</p>
          <p className="break-all text-xl font-bold tabular-nums text-rose-700" aria-label={`直近7日間 ${support.recent} ハート`}>+{compactSupport(support.recent!)}</p>
        </div>
      </div>
      {support.direct !== undefined && support.posts !== undefined && <div className="mt-4 grid grid-cols-2 gap-2">
        {[['投稿へのいいね', support.posts], ['直接の応援', support.direct]].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl bg-white/80 px-3 py-3"><p className="text-xs text-slate-600">{label}</p><p className="mt-1 break-all text-lg font-bold tabular-nums text-rose-800" title={BigInt(value).toLocaleString('ja-JP')}>{compactSupport(value)}</p></div>)}
      </div>}
      {facilityId && Boolean(support.topPosts?.length) && <div className="mt-4 rounded-xl bg-white p-3">
        <h3 className="text-xs font-bold text-slate-700">直近7日間にいいねが届いた投稿</h3>
        <ul className="mt-2 space-y-1">{support.topPosts!.map(post => <li key={post.id}><a href={`https://cares.carespace.jp/facility/${facilityId}#post-${post.id}`} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-rose-50"><span className="min-w-0 truncate text-sm font-medium text-slate-700">{post.title || '投稿'}</span><span className="shrink-0 text-xs font-bold text-rose-700">♡ {compactSupport(post.recent)}</span></a></li>)}</ul>
      </div>}
      <details className="mt-3 text-xs text-gray-600"><summary className="cursor-pointer py-1">正確な数と集計について</summary>
        <p className="mt-2 break-all">合計 {BigInt(support.total!).toLocaleString('ja-JP')} ／ 直近7日間 +{BigInt(support.recent!).toLocaleString('ja-JP')}</p>
        <p className="mt-1 leading-relaxed">公開中の投稿へのいいねと、直接の応援の合計です。いいねの取り消しや投稿の非公開・削除は合計にも反映されます。直接の応援には繰り返し分を含みます。人数や品質の点数ではありません。</p>
        {support.direct !== undefined && support.posts !== undefined && <p className="mt-2 break-all">投稿へのいいね {BigInt(support.posts).toLocaleString('ja-JP')} ／ 直接の応援 {BigInt(support.direct).toLocaleString('ja-JP')}</p>}
        <p className="mt-2 leading-relaxed">直近7日間は、その期間に届いた直接の応援と、期間中についた現在有効な投稿いいねの数です。</p>
      </details>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">{hasHearts ? '応援してくれた方へ、最新の空き状況や日々の様子を届けましょう。' : '写真や空き状況を整えて、QRコードで事業所を紹介してみましょう。'}</p>
    </> : <p className="mt-3 text-sm leading-relaxed text-gray-700">{support.status === 'unlinked' ? '事業所検索の掲載情報との連携が確認できていないため、応援数はまだ表示できません。Caresの事業所ページから掲載の連携をご確認ください。' : '時間をおいて再読み込みしてください。掲載情報の編集や共有は引き続き利用できます。'}</p>}
    {children && <div className="mt-4 flex flex-wrap gap-2">{children}</div>}
  </div>
}
