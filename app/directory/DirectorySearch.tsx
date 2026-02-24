'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import FacilityDirectoryCard from '@/components/FacilityDirectoryCard'
import DirectoryPagination from '@/components/DirectoryPagination'

const serviceTypes = [
  '訪問介護',
  '訪問看護',
  '通所介護',
  '短期入所生活介護',
  '居宅介護支援',
  '特定施設入居者生活介護',
  '認知症対応型共同生活介護',
  '介護老人福祉施設',
  '介護老人保健施設',
  '介護医療院',
  '小規模多機能型居宅介護',
  '看護小規模多機能型居宅介護',
  '定期巡回・随時対応型訪問介護看護',
  '地域密着型通所介護',
  '夜間対応型訪問介護',
  '福祉用具貸与',
  '訪問リハビリテーション',
  '通所リハビリテーション',
  '訪問入浴介護',
]

const prefectures = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県',
  '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
]

type Facility = {
  id: string
  facility_name: string
  service_type: string | null
  address: string | null
  phone: string | null
  jigyosho_number: string | null
  acceptance_status: string | null
  source: string | null
  vacancy_summary: {
    has_vacancy: number
    no_vacancy: number
    unknown: number
    latest_report_at: string | null
  }
}

type ApiResponse = {
  facilities: Facility[]
  total: number
  page: number
  totalPages: number
}

export default function DirectorySearch() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [prefecture, setPrefecture] = useState(searchParams.get('prefecture') || '')
  const [serviceType, setServiceType] = useState(searchParams.get('service_type') || '')
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const fetchData = useCallback(async (q: string, pref: string, sType: string, p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (pref) params.set('prefecture', pref)
      if (sType) params.set('service_type', sType)
      params.set('page', String(p))
      params.set('limit', '20')

      const res = await fetch(`/api/directory?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  // Update URL params
  const updateUrl = useCallback((q: string, pref: string, sType: string, p: number) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (pref) params.set('prefecture', pref)
    if (sType) params.set('service_type', sType)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    router.replace(qs ? `/directory?${qs}` : '/directory', { scroll: false })
  }, [router])

  // Initial fetch
  useEffect(() => {
    fetchData(query, prefecture, serviceType, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchData(query, prefecture, serviceType, 1)
      updateUrl(query, prefecture, serviceType, 1)
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, prefecture, serviceType])

  function handlePageChange(newPage: number) {
    setPage(newPage)
    fetchData(query, prefecture, serviceType, newPage)
    updateUrl(query, prefecture, serviceType, newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const hasActiveFilters = prefecture || serviceType

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="施設名・住所で検索"
          className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-2xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none shadow-sm"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors ${
            hasActiveFilters
              ? 'bg-cares-100 text-cares-700'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Filter dropdowns */}
      {showFilters && (
        <div className="flex gap-3 mb-4 flex-wrap">
          <select
            value={prefecture}
            onChange={(e) => setPrefecture(e.target.value)}
            className="flex-1 min-w-[140px] px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none appearance-none cursor-pointer"
          >
            <option value="">都道府県</option>
            {prefectures.map((pref) => (
              <option key={pref} value={pref}>{pref}</option>
            ))}
          </select>

          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="flex-1 min-w-[140px] px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none appearance-none cursor-pointer"
          >
            <option value="">サービス種別</option>
            {serviceTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setPrefecture('')
                setServiceType('')
              }}
              className="inline-flex items-center gap-1 px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <X className="w-3.5 h-3.5" />
              クリア
            </button>
          )}
        </div>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && !showFilters && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {prefecture && (
            <button
              onClick={() => setPrefecture('')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cares-50 text-cares-700 rounded-lg text-sm font-medium hover:bg-cares-100 transition-colors"
            >
              {prefecture}
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {serviceType && (
            <button
              onClick={() => setServiceType('')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cares-50 text-cares-700 rounded-lg text-sm font-medium hover:bg-cares-100 transition-colors"
            >
              {serviceType}
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      {data && !loading && (
        <p className="text-sm text-gray-500 mb-4">
          {data.total.toLocaleString()}件の事業所
        </p>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="flex gap-2 mb-3">
                <div className="h-5 bg-gray-100 rounded w-20" />
                <div className="h-5 bg-gray-100 rounded w-16" />
              </div>
              <div className="h-4 bg-gray-100 rounded w-full mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Results grid */}
      {!loading && data && data.facilities.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {data.facilities.map((facility) => (
              <FacilityDirectoryCard key={facility.id} facility={facility} />
            ))}
          </div>

          <DirectoryPagination
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* Empty state */}
      {!loading && data && data.facilities.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <Search className="w-10 h-10 text-gray-300" />
          </div>
          <p className="text-lg font-medium text-gray-600 mb-2">
            条件に一致する事業所が見つかりませんでした
          </p>
          <p className="text-base text-gray-400 mb-6">
            検索条件を変更して再度お試しください
          </p>
          <button
            onClick={() => {
              setQuery('')
              setPrefecture('')
              setServiceType('')
            }}
            className="inline-flex items-center px-5 py-2.5 bg-cares-600 text-white rounded-lg text-base font-medium hover:bg-cares-700 transition-colors"
          >
            条件をクリア
          </button>
        </div>
      )}
    </div>
  )
}
