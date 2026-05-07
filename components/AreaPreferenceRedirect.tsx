'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const PREFERRED_AREA_KEY = 'cares_preferred_area'

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

    const params = new URLSearchParams(searchParams.toString())
    params.set('area', preferredArea)
    params.delete('page')
    router.replace(`/?${params.toString()}`)
  }, [router, searchParams])

  return null
}
