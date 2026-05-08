'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const PREFERRED_AREA_KEY = 'cares_preferred_area'
const PREFERRED_LAT_KEY = 'cares_preferred_lat'
const PREFERRED_LNG_KEY = 'cares_preferred_lng'

export default function AreaPreferenceRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (searchParams.get('area')) return

    const hasUserFilter =
      searchParams.get('q') ||
      searchParams.get('status') ||
      searchParams.get('service_type') ||
      searchParams.get('category') ||
      searchParams.get('page')

    if (hasUserFilter) return

    const preferredArea = localStorage.getItem(PREFERRED_AREA_KEY)
    if (!preferredArea) return
    const preferredLat = localStorage.getItem(PREFERRED_LAT_KEY)
    const preferredLng = localStorage.getItem(PREFERRED_LNG_KEY)

    const params = new URLSearchParams(searchParams.toString())
    params.set('area', preferredArea)
    if (preferredLat && preferredLng) {
      params.set('lat', preferredLat)
      params.set('lng', preferredLng)
    }
    params.delete('page')
    router.replace(`/?${params.toString()}`)
  }, [router, searchParams])

  return null
}
