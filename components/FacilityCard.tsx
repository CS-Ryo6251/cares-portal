import Link from 'next/link'

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
            <span className="shrink-0 w-9 h-9 rounded-lg bg-cares-50 border border-cares-100 flex items-center justify-center">
              <span className="text-sm font-bold text-cares-600">{facility.name.charAt(0)}</span>
            </span>
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
