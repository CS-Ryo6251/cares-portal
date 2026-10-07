'use client'

import { useEffect, useState } from 'react'
import { Building2, Loader2, RefreshCw } from 'lucide-react'
import type { MyFacility } from '@/lib/my-facilities'
import FacilityShareCard from '@/components/FacilityShareCard'
import { CARESPACE_MANAGEMENT_URL, facilityManagementUrl } from '@/lib/cares-navigation'

export default function MyFacilitiesClient() {
  const [facilities, setFacilities] = useState<MyFacility[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    let active = true
    setLoading(true)
    setError('')
    fetch('/api/my-facilities?engagement=1', { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (response.status === 401) {
          window.location.replace('/login?redirect=/my-facilities')
          return
        }
        if (!response.ok) throw new Error()
        const data = await response.json()
        if (active) setFacilities(data.facilities)
      })
      .catch(() => { if (active) setError('事業所を読み込めませんでした。通信状況を確認して、もう一度お試しください。') })
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false) })
    return () => { active = false; clearTimeout(timeout); controller.abort() }
  }, [retry])

  return <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
    <div className="mb-6 flex items-start gap-3">
      <Building2 className="mt-1 h-7 w-7 shrink-0 text-cares-600" />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">自分の事業所</h1>
        <a href="/manage" className="mt-3 inline-flex min-h-11 items-center rounded-full border border-rose-100 bg-white px-4 text-sm font-bold text-rose-700">空き情報・申込み受付を開く →</a>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">ご家族やケアマネに、事業所の写真・空き状況・料金をその場でご案内できます。共有したページはログイン不要で見られます。</p>
      </div>
    </div>
    {loading ? <p role="status" className="flex items-center gap-2 py-12 text-gray-600"><Loader2 className="h-5 w-5 animate-spin" />事業所を読み込み中...</p>
      : error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-6">
        <p className="text-sm text-rose-700">{error}</p>
        <button onClick={() => setRetry(value => value + 1)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold"><RefreshCw className="h-4 w-4" />再読み込み</button>
      </div>
      : facilities.length ? <div className="space-y-5">{facilities.map(facility => <FacilityShareCard key={facility.id} facilityId={facility.id} facilityName={facility.name} serviceType={facility.serviceType} publicUrl={facility.publicUrl} managementUrl={facilityManagementUrl(facility.id)} feesUrl={facilityManagementUrl(facility.id, 'fees')} support={facility.support} onRefresh={() => setRetry(value => value + 1)} />)}</div>
      : <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="font-bold text-gray-900">このアカウントに紐づく事業所はありません</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">CareSpace OSで所属事業所が設定されると、ここに表示されます。事業所の担当者は法人の管理者に所属設定をご確認ください。</p>
        <a href={CARESPACE_MANAGEMENT_URL} className="mt-4 inline-block text-sm font-semibold text-cares-700 underline">CareSpace OSで掲載管理を開く</a>
      </div>}
    <a href="/" className="mt-8 inline-block text-sm text-gray-500 underline underline-offset-4">事業所を探す</a>
  </main>
}
