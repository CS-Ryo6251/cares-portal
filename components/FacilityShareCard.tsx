'use client'

import { useState } from 'react'
import { ExternalLink, QrCode } from 'lucide-react'
import FacilityShareDialog from './FacilityShareDialog'

interface Props {
  facilityName: string
  serviceType?: string | null
  publicUrl: string | null
  managementUrl?: string
}

export default function FacilityShareCard({ facilityName, serviceType, publicUrl, managementUrl }: Props) {
  const [shareOpen, setShareOpen] = useState(false)
  return <section className="min-w-0 rounded-2xl border border-rose-100 bg-white p-5 sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><p className="text-xs font-semibold text-rose-700">ご家族・ケアマネへのご案内に</p><h2 className="mt-2 break-words text-lg font-bold text-gray-900">{facilityName}</h2>{serviceType && <p className="mt-1 text-sm text-gray-500">{serviceType}</p>}</div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${publicUrl ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{publicUrl ? '公開中' : '非公開'}</span>
    </div>
    {publicUrl ? <>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">この事業所の写真・空き状況・料金を、公開ページで見せたり送ったりできます。</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-3 text-sm font-bold text-white hover:bg-rose-700"><ExternalLink className="h-4 w-4 shrink-0" />公開ページを見せる</a>
        <button onClick={() => setShareOpen(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-bold text-rose-700"><QrCode className="h-5 w-5 shrink-0" />QRコード・共有</button>
      </div>
    </> : <p className="mt-3 text-sm leading-relaxed text-gray-600">公開ページはまだ共有できません。掲載管理で内容を確認し、公開に設定してください。</p>}
    {managementUrl && <a href={managementUrl} className="mt-4 inline-flex min-h-11 items-center text-sm text-gray-600 underline underline-offset-4">CareSpace OSで掲載情報を編集</a>}
    {shareOpen && publicUrl && <FacilityShareDialog key={publicUrl} facilityName={facilityName} publicUrl={publicUrl} onClose={() => setShareOpen(false)} />}
  </section>
}
