'use client'

import { useState, useEffect } from 'react'
import { Heart, Search, X, BarChart3, MapPin } from 'lucide-react'
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

type Listing = {
  id: string
  facility_name: string
  service_type: string | null
  address: string | null
  phone: string | null
  acceptance_status: string | null
  source: string | null
}

type Favorite = {
  id: string
  listing_id: string
  notify_vacancy: boolean
  created_at: string
  cares_listings: Listing
  note_count: number
}

export default function FavoritesClient() {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)
  const [compareMode, setCompareMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchFavorites()
  }, [])

  async function fetchFavorites() {
    try {
      const res = await fetch('/api/favorites')
      if (res.ok) {
        const data = await res.json()
        setFavorites(data.favorites || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(listingId: string) {
    setDeletingId(listingId)
    // オプティミスティック: UIから先に削除
    const prev = [...favorites]
    setFavorites(favorites.filter(f => f.listing_id !== listingId))
    setSelectedIds(selectedIds.filter(id => id !== listingId))

    try {
      const res = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId }),
      })
      if (!res.ok) {
        setFavorites(prev)
      }
    } catch {
      setFavorites(prev)
    } finally {
      setDeletingId(null)
    }
  }

  function toggleSelect(listingId: string) {
    if (selectedIds.includes(listingId)) {
      setSelectedIds(selectedIds.filter(id => id !== listingId))
    } else if (selectedIds.length < 3) {
      setSelectedIds([...selectedIds, listingId])
    }
  }

  const selectedFavorites = favorites.filter(f => selectedIds.includes(f.listing_id))

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="h-8 w-48 bg-gray-200 rounded mb-6 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="flex gap-2 mb-3">
                <div className="h-5 bg-gray-100 rounded w-20" />
                <div className="h-5 bg-gray-100 rounded w-16" />
              </div>
              <div className="h-4 bg-gray-100 rounded w-full mb-2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (favorites.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">お気に入り</h1>
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <Heart className="w-10 h-10 text-gray-300" />
          </div>
          <p className="text-lg font-medium text-gray-600 mb-2">
            まだお気に入りがありません
          </p>
          <p className="text-base text-gray-400 mb-6">
            気になる施設をお気に入りに追加して、あとで比較できます
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            <Search className="w-4 h-4" />
            施設を探す
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">お気に入り</h1>
          <p className="text-sm text-gray-500 mt-1">
            {favorites.length}件の施設
          </p>
        </div>
        <button
          onClick={() => {
            setCompareMode(!compareMode)
            if (compareMode) setSelectedIds([])
          }}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            compareMode
              ? 'bg-gray-800 text-white hover:bg-gray-700'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          {compareMode ? '比較モード ON' : '比較する'}
        </button>
      </div>

      {/* Compare mode hint */}
      {compareMode && selectedIds.length === 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
          比較したい施設をクリックして選択してください（最大3施設）
        </div>
      )}

      {/* Facility cards grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {favorites.map((fav) => {
          const listing = fav.cares_listings
          if (!listing) return null

          const typeLabel = listing.service_type
            ? facilityTypeLabels[listing.service_type] || listing.service_type
            : null
          const status = acceptanceStatusMap[listing.acceptance_status || 'unknown'] || acceptanceStatusMap.unknown
          const isSelected = selectedIds.includes(fav.listing_id)

          return (
            <div
              key={fav.id}
              className={`relative bg-white rounded-2xl border shadow-sm transition-all ${
                compareMode && isSelected
                  ? 'border-gray-800 ring-2 ring-gray-800/20'
                  : 'border-gray-100'
              } ${compareMode ? 'cursor-pointer' : ''}`}
              onClick={compareMode ? () => toggleSelect(fav.listing_id) : undefined}
            >
              {/* Compare checkbox */}
              {compareMode && (
                <div className="absolute top-4 left-4 z-10">
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-gray-800 border-gray-800'
                        : selectedIds.length >= 3
                          ? 'border-gray-200 bg-gray-50'
                          : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              )}

              {/* Delete button */}
              {!compareMode && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleDelete(fav.listing_id)
                  }}
                  disabled={deletingId === fav.listing_id}
                  className="absolute top-3 right-3 z-10 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="お気に入りから削除"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <div className={`px-4 py-4 sm:px-5 sm:py-5 ${compareMode ? 'pl-11' : ''}`}>
                {/* Facility name */}
                {compareMode ? (
                  <span className="text-base font-bold text-gray-900 leading-snug block pr-2">
                    {listing.facility_name}
                  </span>
                ) : (
                  <Link
                    href={`/directory/${listing.id}`}
                    className="text-base font-bold text-gray-900 leading-snug hover:text-cares-600 transition-colors block pr-8"
                  >
                    {listing.facility_name}
                  </Link>
                )}

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
                  {fav.note_count > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                      メモ {fav.note_count}件
                    </span>
                  )}
                </div>

                {/* Address */}
                {listing.address && (
                  <div className="flex items-center gap-1.5 mt-2.5 text-sm text-gray-500">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                    <span className="truncate">{listing.address}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Comparison table */}
      {compareMode && selectedIds.length >= 2 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            施設比較（{selectedFavorites.length}施設）
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium w-28 shrink-0">項目</th>
                  {selectedFavorites.map((fav) => (
                    <th key={fav.id} className="text-left py-3 px-4 font-bold text-gray-900 min-w-[160px]">
                      <Link
                        href={`/directory/${fav.cares_listings.id}`}
                        className="hover:text-cares-600 transition-colors"
                      >
                        {fav.cares_listings.facility_name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* サービス種別 */}
                <tr className="border-b border-gray-50">
                  <td className="py-3 px-4 text-gray-500 font-medium">種別</td>
                  {selectedFavorites.map((fav) => {
                    const st = fav.cares_listings.service_type
                    return (
                      <td key={fav.id} className="py-3 px-4 text-gray-700">
                        {st ? (facilityTypeLabels[st] || st) : '-'}
                      </td>
                    )
                  })}
                </tr>
                {/* 受入状況 */}
                <tr className="border-b border-gray-50">
                  <td className="py-3 px-4 text-gray-500 font-medium">受入状況</td>
                  {selectedFavorites.map((fav) => {
                    const s = acceptanceStatusMap[fav.cares_listings.acceptance_status || 'unknown'] || acceptanceStatusMap.unknown
                    return (
                      <td key={fav.id} className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${s.color}`}>
                          {s.label}
                        </span>
                      </td>
                    )
                  })}
                </tr>
                {/* 住所 */}
                <tr className="border-b border-gray-50">
                  <td className="py-3 px-4 text-gray-500 font-medium">住所</td>
                  {selectedFavorites.map((fav) => (
                    <td key={fav.id} className="py-3 px-4 text-gray-700 text-xs leading-relaxed">
                      {fav.cares_listings.address || '-'}
                    </td>
                  ))}
                </tr>
                {/* 専門職メモ数 */}
                <tr>
                  <td className="py-3 px-4 text-gray-500 font-medium">メモ数</td>
                  {selectedFavorites.map((fav) => (
                    <td key={fav.id} className="py-3 px-4 text-gray-700">
                      {fav.note_count > 0 ? `${fav.note_count}件` : '-'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
