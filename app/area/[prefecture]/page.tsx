import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Building2, ChevronRight } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { prefectures, facilityTypeLabels, vacancyStatusMap } from '@/lib/constants'
import ServiceTypeIcon from '@/components/ServiceTypeIcon'
import CompletenessBar from '@/components/CompletenessBar'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ prefecture: string }>
  searchParams: Promise<{ service_type?: string; page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { prefecture } = await params
  const decoded = decodeURIComponent(prefecture)

  if (!prefectures.includes(decoded as any)) {
    return { title: 'ページが見つかりません' }
  }

  return {
    title: `${decoded}の介護事業所一覧`,
    description: `${decoded}の介護事業所を検索。デイサービス、特養、老健、訪問介護、居宅介護支援など、空き状況・料金・専門職メモを確認できます。`,
    alternates: {
      canonical: `https://cares.carespace.jp/area/${encodeURIComponent(decoded)}`,
    },
    openGraph: {
      title: `${decoded}の介護事業所一覧 — Cares`,
      description: `${decoded}の介護事業所を検索。空き状況・料金・専門職メモをみんなで共有。`,
    },
  }
}

const PER_PAGE = 30

async function getAreaFacilities(prefecture: string, serviceType?: string, page = 1) {
  const supabase = getSupabaseClient()
  const from = (page - 1) * PER_PAGE
  const to = from + PER_PAGE - 1

  let query = supabase
    .from('cares_listings')
    .select('id, facility_name, service_type, address, acceptance_status, is_owner_verified, completeness_score, completeness_tier', { count: 'exact' })
    .eq('prefecture', prefecture)
    .order('completeness_score', { ascending: false, nullsFirst: false })
    .range(from, to)

  if (serviceType) {
    query = query.eq('service_type', serviceType)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('Area facilities error:', error)
    return { facilities: [], total: 0 }
  }

  return { facilities: data || [], total: count || 0 }
}

async function getServiceTypeCounts(prefecture: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('cares_listings')
    .select('service_type')
    .eq('prefecture', prefecture)

  if (error || !data) return []

  const counts: Record<string, number> = {}
  for (const row of data) {
    if (row.service_type) {
      counts[row.service_type] = (counts[row.service_type] || 0) + 1
    }
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([type, count]) => ({ type, count, label: facilityTypeLabels[type] || type }))
}

async function getCities(prefecture: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('cares_listings')
    .select('city')
    .eq('prefecture', prefecture)

  if (error || !data) return []

  const counts: Record<string, number> = {}
  for (const row of data) {
    if (row.city) {
      counts[row.city] = (counts[row.city] || 0) + 1
    }
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([city, count]) => ({ city, count }))
}

export default async function AreaPage({ params, searchParams }: Props) {
  const { prefecture } = await params
  const decoded = decodeURIComponent(prefecture)
  const sp = await searchParams

  if (!prefectures.includes(decoded as any)) {
    notFound()
  }

  const currentPage = Math.max(1, parseInt(sp.page || '1', 10))
  const serviceType = sp.service_type || undefined

  const [{ facilities, total }, serviceTypeCounts, cities] = await Promise.all([
    getAreaFacilities(decoded, serviceType, currentPage),
    getServiceTypeCounts(decoded),
    getCities(decoded),
  ])

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-gray-600">トップ</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/area" className="hover:text-gray-600">エリア</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-700 font-medium">{decoded}</span>
      </nav>

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-cares-50 rounded-xl flex items-center justify-center">
            <MapPin className="w-5 h-5 text-cares-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {decoded}の介護事業所
            {serviceType && (
              <span className="text-lg font-normal text-gray-500 ml-2">
                / {facilityTypeLabels[serviceType] || serviceType}
              </span>
            )}
          </h1>
        </div>
        <p className="text-sm text-gray-500">
          {total.toLocaleString()}件の事業所が見つかりました
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-8">
        {/* Main content */}
        <div>
          {/* Service type filter pills */}
          <div className="mb-6 -mx-4 px-4 lg:mx-0 lg:px-0">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Link
                href={`/area/${encodeURIComponent(decoded)}`}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !serviceType
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
                }`}
              >
                すべて
              </Link>
              {serviceTypeCounts.map((st) => (
                <Link
                  key={st.type}
                  href={`/area/${encodeURIComponent(decoded)}?service_type=${encodeURIComponent(st.type)}`}
                  className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    serviceType === st.type
                      ? 'bg-gray-800 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {st.label} ({st.count})
                </Link>
              ))}
            </div>
          </div>

          {/* Facility list */}
          <div className="space-y-3">
            {facilities.map((item: any) => {
              const status = vacancyStatusMap[item.acceptance_status]
              return (
                <Link
                  key={item.id}
                  href={`/directory/${item.id}`}
                  className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ServiceTypeIcon serviceType={item.service_type} size="sm" />
                      <span className="text-base font-bold text-gray-900">{item.facility_name}</span>
                      {item.is_owner_verified && (
                        <span className="shrink-0 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          公式
                        </span>
                      )}
                      {item.service_type && (
                        <span className="shrink-0 px-2.5 py-0.5 rounded-md text-xs font-medium bg-cares-50 text-cares-700">
                          {facilityTypeLabels[item.service_type] || item.service_type}
                        </span>
                      )}
                      {status && (
                        <span className={`shrink-0 px-2.5 py-0.5 rounded-md text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      )}
                    </div>
                    {item.address && (
                      <p className="text-sm text-gray-500 mt-1.5">{item.address}</p>
                    )}
                    <div className="mt-1.5">
                      <CompletenessBar score={item.completeness_score || 0} tier={item.completeness_tier || 'insufficient'} size="sm" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Empty state */}
          {facilities.length === 0 && (
            <div className="text-center py-16">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">該当する事業所が見つかりませんでした</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {currentPage > 1 && (
                <Link
                  href={`/area/${encodeURIComponent(decoded)}?${new URLSearchParams({ ...(serviceType ? { service_type: serviceType } : {}), page: String(currentPage - 1) }).toString()}`}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  前へ
                </Link>
              )}
              <span className="text-sm text-gray-500">
                {currentPage} / {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={`/area/${encodeURIComponent(decoded)}?${new URLSearchParams({ ...(serviceType ? { service_type: serviceType } : {}), page: String(currentPage + 1) }).toString()}`}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  次へ
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: cities + area navigation */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-6">
            {/* Cities in this prefecture */}
            {cities.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-sm font-bold text-gray-700 mb-3">{decoded}の市区町村</h2>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {cities.map(({ city, count }) => (
                    <Link
                      key={city}
                      href={`/?area=${encodeURIComponent(decoded)}:${encodeURIComponent(city)}`}
                      className="flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <span>{city}</span>
                      <span className="text-xs text-gray-400">{count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Other prefectures */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-3">他のエリア</h2>
              <div className="flex flex-wrap gap-1.5">
                {prefectures.filter(p => p !== decoded).slice(0, 20).map((pref) => (
                  <Link
                    key={pref}
                    href={`/area/${encodeURIComponent(pref)}`}
                    className="px-2.5 py-1 text-xs text-gray-500 bg-gray-50 rounded-md hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  >
                    {pref}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${decoded}の介護事業所一覧`,
            description: `${decoded}の介護事業所${total}件を掲載。空き状況・料金・専門職メモを確認できます。`,
            url: `https://cares.carespace.jp/area/${encodeURIComponent(decoded)}`,
            isPartOf: {
              '@type': 'WebSite',
              name: 'Cares',
              url: 'https://cares.carespace.jp',
            },
          }),
        }}
      />
    </div>
  )
}
