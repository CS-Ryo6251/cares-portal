'use client'

import { useState, useEffect } from 'react'
import { Heart, Search, X, BarChart3, MapPin } from 'lucide-react'
import Link from 'next/link'
import { facilityTypeLabels, acceptanceStatusMap } from '@/lib/constants'

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

export default function FavoritesTab() {
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

  if (loading) {
    return (
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
    )
  }

  if (favorites.length === 0) {
    return (
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
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{favorites.length}件の施設</p>
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

      {compareMode && selectedIds.length === 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
          比較したい施設をクリックして選択してください（最大3施設）
        </div>
      )}

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
                <tr className="border-b border-gray-50">
                  <td className="py-3 px-4 text-gray-500 font-medium">住所</td>
                  {selectedFavorites.map((fav) => (
                    <td key={fav.id} className="py-3 px-4 text-gray-700 text-xs leading-relaxed">
                      {fav.cares_listings.address || '-'}
                    </td>
                  ))}
                </tr>
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
    </>
  )
}
