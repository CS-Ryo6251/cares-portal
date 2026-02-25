import Link from 'next/link'
import ServiceTypeIcon from './ServiceTypeIcon'
import { facilityTypeLabels, acceptanceStatusMap } from '@/lib/constants'

type FacilityCardProps = {
  facility: {
    facility_id: string
    name: string
    address: string
    service_type: string
    icon_url: string | null
    acceptance_status: string
    overview: string | null
  }
}

export default function FacilityCard({ facility }: FacilityCardProps) {
  const typeLabel = facilityTypeLabels[facility.service_type] || facility.service_type
  const status = acceptanceStatusMap[facility.acceptance_status] || acceptanceStatusMap.unknown

  return (
    <Link
      href={`/facility/${facility.facility_id}`}
      className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="px-5 py-5">
        <div className="flex items-center gap-2 flex-wrap">
          {facility.icon_url ? (
            <img
              src={facility.icon_url}
              alt={facility.name}
              className="shrink-0 w-9 h-9 rounded-lg object-cover border border-gray-200"
            />
          ) : (
            <ServiceTypeIcon serviceType={facility.service_type} size="sm" />
          )}
          <span className="text-lg font-bold text-gray-900 leading-snug">
            {facility.name}
          </span>
          <span className="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-cares-50 text-cares-700">
            {typeLabel}
          </span>
          <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-2">{facility.address}</p>
        {facility.overview && (
          <p className="text-base text-gray-700 mt-2 line-clamp-2 leading-relaxed">
            {facility.overview}
          </p>
        )}
      </div>
    </Link>
  )
}
