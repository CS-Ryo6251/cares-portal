'use client'

import { useState, useEffect } from 'react'
import { MapPin, X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import {
  GEO_DISMISSED_KEY,
  PREFERRED_AREA_KEY,
  PREFERRED_LAT_KEY,
  PREFERRED_LNG_KEY,
  resolveAreaFromCoordinates,
} from '@/lib/client-location'

export default function GeolocationBanner() {
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('area')) return
    if (typeof window === 'undefined') return
    if (localStorage.getItem(PREFERRED_AREA_KEY)) return
    if (localStorage.getItem(GEO_DISMISSED_KEY)) return
    if (!navigator.geolocation) return
    setVisible(true)
  }, [searchParams])

  const handleDetect = () => {
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const area = await resolveAreaFromCoordinates(position.coords.latitude, position.coords.longitude)
        localStorage.setItem(PREFERRED_AREA_KEY, area)
        localStorage.setItem(PREFERRED_LAT_KEY, String(position.coords.latitude))
        localStorage.setItem(PREFERRED_LNG_KEY, String(position.coords.longitude))
        localStorage.setItem(GEO_DISMISSED_KEY, '1')
        // Build URL preserving existing params
        const params = new URLSearchParams(searchParams.toString())
        params.set('area', area)
        params.set('lat', String(position.coords.latitude))
        params.set('lng', String(position.coords.longitude))
        params.delete('page')
        window.location.href = `/?${params.toString()}`
      },
      () => {
        // Permission denied or error — just close the banner
        localStorage.setItem(GEO_DISMISSED_KEY, '1')
        setVisible(false)
      }
    )
  }

  const handleDismiss = () => {
    localStorage.setItem(GEO_DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="mb-4 bg-cares-50 border border-cares-200 rounded-2xl px-4 py-3 flex items-center gap-3">
      <MapPin className="w-5 h-5 text-cares-600 shrink-0" />
      <p className="text-sm text-cares-800 flex-1">
        現在地から近くの施設を探しませんか？
      </p>
      <button
        onClick={handleDetect}
        disabled={loading}
        className="shrink-0 px-4 py-2 bg-cares-600 text-white rounded-lg text-sm font-medium hover:bg-cares-700 transition-colors disabled:opacity-50"
      >
        {loading ? '取得中...' : '現在地から検索'}
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-2 text-cares-400 hover:text-cares-600 transition-colors"
        aria-label="閉じる"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
