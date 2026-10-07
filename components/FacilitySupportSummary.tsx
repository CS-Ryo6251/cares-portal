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

export default function FacilitySupportSummary({ support, children }: { support: FacilitySupport; children?: ReactNode }) {
  const ready = support.status === 'ready' && support.total !== null && support.recent !== null
  const hasHearts = ready && support.total !== '0'
  return <div className="min-w-0 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:p-5">
    <p className="flex items-center gap-2 text-sm font-bold text-rose-800"><Heart className="h-5 w-5 shrink-0 fill-rose-500 text-rose-500" aria-hidden="true" />
      {ready ? hasHearts ? 'あなたの事業所に応援が届いています' : '最初の応援につながる、事業所の紹介を' : support.status === 'unlinked' ? '応援を事業所につなげましょう' : '応援を読み込めませんでした'}
    </p>
    {ready ? <>
      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="min-w-0"><p className="text-xs text-rose-800">これまでの応援</p>
          <p className="mt-1 break-all text-3xl font-bold tabular-nums text-rose-700" title={BigInt(support.total!).toLocaleString('ja-JP')} aria-label={`累計 ${support.total} ハート`}>{compactSupport(support.total!)}<span className="ml-1 text-sm font-medium">ハート</span></p>
        </div>
        <div className="min-w-0 rounded-xl bg-white px-3 py-2"><p className="text-xs text-gray-600">直近7日間</p>
          <p className="break-all text-xl font-bold tabular-nums text-rose-700" aria-label={`直近7日間 ${support.recent} ハート`}>+{compactSupport(support.recent!)}</p>
        </div>
      </div>
      <details className="mt-3 text-xs text-gray-600"><summary className="cursor-pointer py-1">正確な数と集計について</summary>
        <p className="mt-2 break-all">累計 {BigInt(support.total!).toLocaleString('ja-JP')} ／ 直近7日間 +{BigInt(support.recent!).toLocaleString('ja-JP')}</p>
        <p className="mt-1 leading-relaxed">繰り返し送られたハートを含む応援回数です。人数やサービスの品質を示す点数ではありません。</p>
      </details>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">{hasHearts ? '応援してくれた方へ、最新の空き状況や日々の様子を届けましょう。' : '写真や空き状況を整えて、QRコードで事業所を紹介してみましょう。'}</p>
    </> : <p className="mt-3 text-sm leading-relaxed text-gray-700">{support.status === 'unlinked' ? '事業所検索の掲載情報との連携が確認できていないため、応援数はまだ表示できません。Caresの事業所ページから掲載の連携をご確認ください。' : '時間をおいて再読み込みしてください。掲載情報の編集や共有は引き続き利用できます。'}</p>}
    {children && <div className="mt-4 flex flex-wrap gap-2">{children}</div>}
  </div>
}
