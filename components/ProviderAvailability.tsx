import type { ProviderAvailability as Availability } from '@/lib/provider-availability'
import { VACANCY_LABELS } from '@/lib/intake'
import { publicAvailabilityConditions, publicAvailabilityTables, publicCalendarPeriod } from '@/lib/availability-presentation'

export default function ProviderAvailability({ availability, serviceType }: { availability: Availability; serviceType?: string }) {
  const tables = publicAvailabilityTables(availability.summary || {}, serviceType)
  const conditions = publicAvailabilityConditions(availability.summary || {})
  const period = publicCalendarPeriod(availability.summary || {})
  const detailsVisible = availability.published && ['has_vacancy','conditional'].includes(availability.status)
  const recruiting = availability.published && availability.recruitment_status === 'active' && ['has_vacancy','conditional'].includes(availability.status)
  return <section className="my-5 rounded-2xl border border-emerald-100 bg-white p-5 sm:p-6" aria-label="事業所からの空き情報">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">事業所からの空き情報</h2><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-900">{VACANCY_LABELS[availability.status] || VACANCY_LABELS.unknown}</span></div>
    {recruiting && <p className="mt-3 font-bold text-emerald-800">利用者を募集しています</p>}
    {availability.published && availability.checked_at && <p className="mt-3 text-xs leading-6 text-slate-500">確認：{new Date(availability.checked_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} ／ 掲載期限：{availability.valid_until}<br />情報源：事業所の回答{availability.evidence === 'fax_reply' ? '（FAXで届いた照会への回答）' : ''}</p>}
    {!availability.published && <p className="mt-3 text-sm text-slate-600">現在公開されている受入情報はありません。事業所へご確認ください。</p>}
    {detailsVisible && period && <p className="mt-3 text-xs leading-6 text-slate-500">{period}</p>}
    {detailsVisible && tables.map((table,index) => <div key={index} className="mt-4"><h3 className="mb-2 text-sm font-bold">{table.title}</h3><div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[480px] text-left text-sm"><thead className="bg-slate-50"><tr>{table.headers.map((header,i) => <th key={i} scope="col" className="p-3 font-semibold">{header}</th>)}</tr></thead><tbody>{table.rows.map((row,i) => <tr key={i} className="border-t border-slate-100">{row.map((value,j) => <td key={j} className="whitespace-pre-wrap p-3 align-top">{value || '未記載'}</td>)}</tr>)}</tbody></table></div></div>)}
    {detailsVisible && conditions.length > 0 && <dl className="mt-4 space-y-3 text-sm">{conditions.map(item => <div key={item.label}><dt className="font-semibold text-slate-500">{item.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{item.value}</dd></div>)}</dl>}
    <p className="mt-4 text-xs leading-6 text-slate-500">一般的な受入状況です。個別の受入れ・利用日はご相談のうえ決まります。空欄は受入不可を意味しません。</p>
  </section>
}
