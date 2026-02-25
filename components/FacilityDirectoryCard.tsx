import Link from 'next/link'
import { MapPin, Phone } from 'lucide-react'
import { facilityTypeLabels, acceptanceStatusMap } from '@/lib/constants'

type VacancySummary = {
  has_vacancy: number
  no_vacancy: number
  unknown: number
  latest_report_at: string | null
}

type FacilityDirectoryCardProps = {
  facility: {
    id: string
    facility_name: string
    service_type: string | null
    address: string | null
    phone: string | null
    jigyosho_number: string | null
    acceptance_status: string | null
    source: string | null
    vacancy_summary: VacancySummary
  }
}

export default function FacilityDirectoryCard({ facility }: FacilityDirectoryCardProps) {
  const typeLabel = facility.service_type
    ? facilityTypeLabels[facility.service_type] || facility.service_type
    : null
  const status = acceptanceStatusMap[facility.acceptance_status || 'unknown'] || acceptanceStatusMap.unknown
  const isOfficial = facility.source === 'owner_verified'
  const hasVacancyReports =
    facility.vacancy_summary.has_vacancy > 0 ||
    facility.vacancy_summary.no_vacancy > 0

  return (
    <Link
      href={`/directory/${facility.id}`}
      className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="px-4 py-4 sm:px-5 sm:py-5">
        {/* Header row */}
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
            {facility.facility_name}
          </span>
          {isOfficial && (
            <span className="shrink-0 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              公式
            </span>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {typeLabel && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-cares-50 text-cares-700">
              {typeLabel}
            </span>
          )}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
          {hasVacancyReports && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              空き情報あり
            </span>
          )}
        </div>

        {/* Address */}
        {facility.address && (
          <div className="flex items-center gap-1.5 mt-2.5 text-sm text-gray-500">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
            <span className="truncate">{facility.address}</span>
          </div>
        )}

        {/* Phone + Jigyosho number */}
        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
          {facility.phone && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Phone className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              <span>{facility.phone}</span>
            </div>
          )}
          {facility.jigyosho_number && (
            <span className="text-xs text-gray-400">
              事業所番号: {facility.jigyosho_number}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
