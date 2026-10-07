import { Heart } from 'lucide-react'
import { compactHearts, formatHearts } from '@/lib/community'

export default function HeartCount({ total }: { total: string | null | undefined }) {
  const exact = formatHearts(total)
  const label = exact === '—' ? '応援数を取得できません' : `応援の累計 ${exact}`
  return <span title={label} aria-label={label} className="inline-flex max-w-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
    <Heart aria-hidden="true" className="h-3.5 w-3.5 shrink-0 fill-current" />
    <span aria-hidden="true" className="tabular-nums">{compactHearts(total)}</span>
    <span aria-hidden="true" className="font-medium">応援</span>
  </span>
}
