import Link from 'next/link'
import { MapPin, Phone } from 'lucide-react'

const facilityTypeLabels: Record<string, string> = {
  訪問介護: '訪問介護',
  訪問入浴介護: '訪問入浴',
  訪問看護: '訪問看護',
  訪問リハビリテーション: '訪問リハ',
  通所介護: 'デイサービス',
  '通所介護（療養通所介護）': '療養通所',
  通所リハビリテーション: '通所リハ',
  短期入所生活介護: 'ショートステイ',
  '短期入所療養介護（介護老人保健施設）': 'SS(老健)',
  '短期入所療養介護（介護療養型医療施設）': 'SS(療養)',
  '短期入所療養介護（介護医療院）': 'SS(医療院)',
  認知症対応型共同生活介護: 'グループホーム',
  '特定施設入居者生活介護（有料老人ホーム）': '有料老人ホーム',
  '特定施設入居者生活介護（軽費老人ホーム）': '軽費老人ホーム',
  '特定施設入居者生活介護（サービス付き高齢者向け住宅）': 'サ高住',
  福祉用具貸与: '福祉用具貸与',
  特定福祉用具販売: '福祉用具販売',
  居宅介護支援: '居宅介護支援',
  介護老人福祉施設: '特養',
  介護老人保健施設: '老健',
  介護療養型医療施設: '介護療養型',
  介護医療院: '介護医療院',
  地域密着型介護老人福祉施設入所者生活介護: '地域密着型特養',
  夜間対応型訪問介護: '夜間訪問介護',
  認知症対応型通所介護: '認知症デイ',
  小規模多機能型居宅介護: '小規模多機能',
  '定期巡回・随時対応型訪問介護看護': '定期巡回',
  看護小規模多機能型居宅介護: '看多機',
  地域密着型通所介護: '地域密着デイ',
  地域包括支援センター: '地域包括',
  居宅介護支援事業所: '居宅介護支援',
  特別養護老人ホーム: '特養',
  グループホーム: 'グループホーム',
  有料老人ホーム: '有料老人ホーム',
  サービス付き高齢者向け住宅: 'サ高住',
}

const acceptanceStatusMap: Record<string, { label: string; color: string }> = {
  accepting: { label: '受入可能', color: 'bg-green-100 text-green-700' },
  limited: { label: '条件付き', color: 'bg-yellow-100 text-yellow-700' },
  waitlist: { label: '待機あり', color: 'bg-orange-100 text-orange-700' },
  not_accepting: { label: '受入停止中', color: 'bg-red-100 text-red-700' },
  unknown: { label: '要問合せ', color: 'bg-gray-100 text-gray-600' },
}

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
