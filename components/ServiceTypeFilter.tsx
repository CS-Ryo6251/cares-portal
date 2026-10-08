'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import ServiceTypeOptions from './ServiceTypeOptions'

export default function ServiceTypeFilter() {
  const router = useRouter(), params = useSearchParams()
  const current = params.get('service_type') || ''
  return <select aria-label="サービス種別" value={current} onChange={event => {
    const next = new URLSearchParams(params.toString())
    if (event.target.value) next.set('service_type', event.target.value)
    else next.delete('service_type')
    next.delete('page')
    router.push(next.size ? `/?${next}` : '/')
  }} className="mb-4 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700">
    <option value="">すべてのサービス種別</option>
    <ServiceTypeOptions currentValue={current} />
  </select>
}
