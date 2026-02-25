'use client'

import { useState, useEffect } from 'react'
import { Star, Search, X, MapPin } from 'lucide-react'
import Link from 'next/link'

const facilityTypeLabels: Record<string, string> = {
  訪問介護: '訪問介護',
  訪問入浴介護: '訪問入浴',
  訪問看護: '訪問看護',
  訪問リハビリテーション: '訪問リハ',
  通所介護: 'デイサービス',
  通所リハビリテーション: '通所リハ',
  短期入所生活介護: 'ショートステイ',
  認知症対応型共同生活介護: 'グループホーム',
  '特定施設入居者生活介護（有料老人ホーム）': '有料老人ホーム',
  '特定施設入居者生活介護（サービス付き高齢者向け住宅）': 'サ高住',
  福祉用具貸与: '福祉用具貸与',
  居宅介護支援: '居宅介護支援',
  介護老人福祉施設: '特養',
  介護老人保健施設: '老健',
  介護医療院: '介護医療院',
  小規模多機能型居宅介護: '小規模多機能',
  看護小規模多機能型居宅介護: '看多機',
  '定期巡回・随時対応型訪問介護看護': '定期巡回',
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

type RatingListing = {
  id: string
  facility_name: string
  service_type: string | null
  address: string | null
  acceptance_status: string | null
}

type RatingEntry = {
  listing_id: string
  rating: number
  updated_at: string
  cares_listings: RatingListing
}

export default function RatingsTab() {
  const [ratings, setRatings] = useState<RatingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchRatings()
  }, [])

  async function fetchRatings() {
    try {
      const res = await fetch('/api/my-actions/ratings')
      if (res.ok) {
        const data = await res.json()
        setRatings(data.ratings || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(listingId: string) {
    setDeletingId(listingId)
    const prev = [...ratings]
    setRatings(ratings.filter(r => r.listing_id !== listingId))

    try {
      const res = await fetch(`/api/directory/${listingId}/rating`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        setRatings(prev)
      }
    } catch {
      setRatings(prev)
    } finally {
      setDeletingId(null)
    }
  }

  // service_typeでグルーピング
  const grouped = ratings.reduce<Record<string, RatingEntry[]>>((acc, r) => {
    const key = r.cares_listings?.service_type || 'その他'
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  // 各グループ内で rating DESC でソート済み（APIで既にソート）
  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    const aLabel = facilityTypeLabels[a] || a
    const bLabel = facilityTypeLabels[b] || b
    return aLabel.localeCompare(bLabel)
  })

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (ratings.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <Star className="w-10 h-10 text-gray-300" />
        </div>
        <p className="text-lg font-medium text-gray-600 mb-2">
          まだ評価がありません
        </p>
        <p className="text-base text-gray-400 mb-6">
          施設を評価すると、カテゴリ別のランキングで確認できます
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <Search className="w-4 h-4" />
          施設を探す
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">{ratings.length}件の評価</p>

      {sortedGroups.map(([serviceType, items]) => (
        <div key={serviceType}>
          {/* Category header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold bg-cares-50 text-cares-700">
              {facilityTypeLabels[serviceType] || serviceType}
            </span>
            <span className="text-xs text-gray-400">{items.length}件</span>
          </div>

          {/* Rating cards */}
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((entry, index) => {
              const listing = entry.cares_listings
              if (!listing) return null

              const status = acceptanceStatusMap[listing.acceptance_status || 'unknown'] || acceptanceStatusMap.unknown

              return (
                <div
                  key={entry.listing_id}
                  className="relative bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 sm:px-5 sm:py-5"
                >
                  {/* Rank badge */}
                  <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-500">{index + 1}</span>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(entry.listing_id)}
                    disabled={deletingId === entry.listing_id}
                    className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="評価を削除"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="pl-9 pr-6">
                    {/* Facility name */}
                    <Link
                      href={`/directory/${listing.id}`}
                      className="text-base font-bold text-gray-900 leading-snug hover:text-cares-600 transition-colors block"
                    >
                      {listing.facility_name}
                    </Link>

                    {/* Stars */}
                    <div className="flex items-center gap-0.5 mt-1.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < entry.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    {/* Address */}
                    {listing.address && (
                      <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        <span className="truncate">{listing.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
