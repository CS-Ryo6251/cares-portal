import Link from 'next/link'
import { ArrowUpRight, CalendarDays, MessageCircle } from 'lucide-react'
import { getIntakeTarget } from '@/lib/intake-server'
import { VACANCY_LABELS } from '@/lib/intake'

export default async function ProviderIntakeSection({ listingId }: { listingId: string }) {
  let target
  try { target = await getIntakeTarget(listingId) } catch { return <p className="my-5 rounded-2xl bg-white p-5 text-sm text-slate-500">空き情報・申込み受付を読み込めませんでした。時間をおいてページを再読み込みしてください。</p> }
  if (!target) return null
  const available = ['has_vacancy','accepting'].includes(target.status)
  return <section id="apply" className="my-6 overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm">
    <div className="p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><CalendarDays className="h-5 w-5 text-rose-500" />空き状況・ご利用の相談</h2><span className={`rounded-full px-3 py-1.5 text-sm font-bold ${available ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>{VACANCY_LABELS[target.status] || VACANCY_LABELS.unknown}</span></div>
      {target.message ? <><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{target.message}</p><p className="mt-2 text-xs text-slate-400">ご案内の更新 {new Date(target.messageUpdatedAt!).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p></> : <p className="mt-4 text-sm leading-7 text-slate-600">希望の曜日や時間、見学・体験について、事業所へお気軽にご相談ください。</p>}
      <p className="mt-3 text-xs leading-5 text-slate-500">空き状況は変わる場合があります。受入れ・日程は事業所からの連絡でご確認ください。</p>
    </div>
    <div className="flex flex-col gap-3 border-t border-rose-50 bg-rose-50/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <p className="flex items-center gap-2 text-sm text-slate-600"><MessageCircle className="h-4 w-4 shrink-0 text-rose-400" />{target.enabled ? 'ご家族・ケアマネからも、ログインなしで申込めます' : 'フォーム受付は現在お休みしています'}</p>
      {target.enabled && <Link href={`/directory/${listingId}/apply`} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-rose-600 px-6 text-sm font-bold text-white hover:bg-rose-700">見学・体験・利用を相談する<ArrowUpRight className="h-4 w-4" /></Link>}
    </div>
  </section>
}
