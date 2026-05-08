'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent, WheelEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Armchair,
  Building2,
  ClipboardList,
  HandHelping,
  Heart,
  Home,
  MapPinned,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
  Search,
  Star,
  Stethoscope,
  Truck,
  Users,
} from 'lucide-react'
import ServiceTypeIcon from './ServiceTypeIcon'
import { resolveAreaFromCoordinates } from '@/lib/client-location'

type FacilityMapItem = {
  id: string
  facility_name: string
  service_type: string | null
  address: string | null
  latitude?: number | null
  longitude?: number | null
  acceptance_status: string | null
  is_owner_verified: boolean
  rating_average: number | null
  rating_count: number
}

type Props = {
  facilities: FacilityMapItem[]
  area?: string
  userLatitude?: number | null
  userLongitude?: number | null
}

type GoogleMapsWindow = Window & {
  google?: any
  __caresGoogleMapsPromise?: Promise<void>
}

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
const googleMapsMapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'
const PREFERRED_AREA_KEY = 'cares_preferred_area'
const PREFERRED_LAT_KEY = 'cares_preferred_lat'
const PREFERRED_LNG_KEY = 'cares_preferred_lng'

const mapServiceStyles: Record<string, { icon: string; color: string; soft: string; label: string }> = {
  visit: { icon: 'truck', color: '#2563eb', soft: '#dbeafe', label: '訪問系' },
  day: { icon: 'users', color: '#16a34a', soft: '#dcfce7', label: '通所系' },
  residential: { icon: 'building', color: '#9333ea', soft: '#f3e8ff', label: '入所系' },
  home: { icon: 'home', color: '#d97706', soft: '#fef3c7', label: '住まい系' },
  shortStay: { icon: 'armchair', color: '#0f766e', soft: '#ccfbf1', label: '短期入所' },
  carePlan: { icon: 'clipboard', color: '#e11d48', soft: '#ffe4e6', label: '居宅介護支援' },
  multi: { icon: 'hand', color: '#4f46e5', soft: '#e0e7ff', label: '多機能系' },
  support: { icon: 'heart', color: '#0284c7', soft: '#e0f2fe', label: '相談支援' },
  default: { icon: 'building', color: '#475569', soft: '#f1f5f9', label: '介護事業所' },
}

const markerSvgPaths: Record<string, string> = {
  building: '<path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16"/><path d="M9 21v-4h3v4"/><path d="M8 7h1"/><path d="M12 7h1"/><path d="M8 11h1"/><path d="M12 11h1"/><path d="M3 21h18"/>',
  home: '<path d="M3 11 12 3l9 8"/><path d="M5 10v11h14V10"/><path d="M9 21v-6h6v6"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>',
  stethoscope: '<path d="M6 3v5a6 6 0 0 0 12 0V3"/><path d="M8 3H4v5a8 8 0 0 0 16 0V3h-4"/><circle cx="20" cy="16" r="2"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  hand: '<path d="M11 11V5a2 2 0 0 1 4 0v6"/><path d="M15 11V7a2 2 0 0 1 4 0v7a7 7 0 0 1-7 7h-1a7 7 0 0 1-7-7v-3a2 2 0 0 1 4 0v2"/><path d="M7 11V9a2 2 0 0 1 4 0v2"/>',
  truck: '<path d="M10 17h4V5H2v12h3"/><path d="M14 17h1"/><path d="M14 8h4l4 4v5h-2"/><circle cx="7" cy="17" r="2"/><circle cx="18" cy="17" r="2"/>',
  armchair: '<path d="M6 9V6a3 3 0 0 1 6 0v3"/><path d="M18 9V6a3 3 0 0 0-6 0v3"/><path d="M4 11h16v6H4z"/><path d="M5 21v-4"/><path d="M19 21v-4"/>',
  clipboard: '<path d="M9 3h6v4H9z"/><path d="M9 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4"/><path d="M8 13h8"/><path d="M8 17h5"/>',
}

const prefectureCoordinates: { name: string; lat: number; lng: number }[] = [
  { name: '北海道', lat: 43.0646, lng: 141.3468 },
  { name: '青森県', lat: 40.8244, lng: 140.74 },
  { name: '岩手県', lat: 39.7036, lng: 141.1527 },
  { name: '宮城県', lat: 38.2688, lng: 140.8721 },
  { name: '秋田県', lat: 39.7186, lng: 140.1024 },
  { name: '山形県', lat: 38.2404, lng: 140.3634 },
  { name: '福島県', lat: 37.7503, lng: 140.4676 },
  { name: '茨城県', lat: 36.3418, lng: 140.4468 },
  { name: '栃木県', lat: 36.5657, lng: 139.8836 },
  { name: '群馬県', lat: 36.3911, lng: 139.0608 },
  { name: '埼玉県', lat: 35.8569, lng: 139.6489 },
  { name: '千葉県', lat: 35.6047, lng: 140.1233 },
  { name: '東京都', lat: 35.6895, lng: 139.6917 },
  { name: '神奈川県', lat: 35.4478, lng: 139.6425 },
  { name: '新潟県', lat: 37.9026, lng: 139.0236 },
  { name: '富山県', lat: 36.6953, lng: 137.2114 },
  { name: '石川県', lat: 36.5947, lng: 136.6256 },
  { name: '福井県', lat: 36.0652, lng: 136.2216 },
  { name: '山梨県', lat: 35.6642, lng: 138.5684 },
  { name: '長野県', lat: 36.2325, lng: 138.1813 },
  { name: '岐阜県', lat: 35.3912, lng: 136.7223 },
  { name: '静岡県', lat: 34.9769, lng: 138.3831 },
  { name: '愛知県', lat: 35.1802, lng: 136.9066 },
  { name: '三重県', lat: 34.7303, lng: 136.5086 },
  { name: '滋賀県', lat: 35.0045, lng: 135.8686 },
  { name: '京都府', lat: 35.0214, lng: 135.7556 },
  { name: '大阪府', lat: 34.6864, lng: 135.52 },
  { name: '兵庫県', lat: 34.6913, lng: 135.183 },
  { name: '奈良県', lat: 34.6851, lng: 135.8327 },
  { name: '和歌山県', lat: 34.226, lng: 135.1675 },
  { name: '鳥取県', lat: 35.5039, lng: 134.2381 },
  { name: '島根県', lat: 35.4723, lng: 133.0505 },
  { name: '岡山県', lat: 34.6618, lng: 133.9344 },
  { name: '広島県', lat: 34.3963, lng: 132.4596 },
  { name: '山口県', lat: 34.1859, lng: 131.4714 },
  { name: '徳島県', lat: 34.0658, lng: 134.5593 },
  { name: '香川県', lat: 34.3401, lng: 134.0434 },
  { name: '愛媛県', lat: 33.8416, lng: 132.7657 },
  { name: '高知県', lat: 33.5597, lng: 133.5311 },
  { name: '福岡県', lat: 33.6064, lng: 130.4183 },
  { name: '佐賀県', lat: 33.2494, lng: 130.2988 },
  { name: '長崎県', lat: 32.7448, lng: 129.8737 },
  { name: '熊本県', lat: 32.7898, lng: 130.7417 },
  { name: '大分県', lat: 33.2382, lng: 131.6126 },
  { name: '宮崎県', lat: 31.9111, lng: 131.4239 },
  { name: '鹿児島県', lat: 31.5602, lng: 130.5582 },
  { name: '沖縄県', lat: 26.3358, lng: 127.8011 },
]

function hashToUnit(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return (hash % 1000) / 1000
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function getPrefecture(address: string | null) {
  return prefectureCoordinates.find((pref) => address?.includes(pref.name))
}

function parseCoordinate(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

function formatRating(value: number | null) {
  return value ? value.toFixed(1) : '-'
}

function getMapServiceStyle(serviceType?: string | null) {
  if (!serviceType) return mapServiceStyles.default
  if (serviceType.includes('訪問')) return mapServiceStyles.visit
  if (serviceType.includes('通所') || serviceType.includes('デイ')) return mapServiceStyles.day
  if (serviceType.includes('特別養護') || serviceType.includes('老人福祉') || serviceType.includes('老人保健') || serviceType.includes('介護医療')) {
    return mapServiceStyles.residential
  }
  if (serviceType.includes('共同生活') || serviceType.includes('グループホーム') || serviceType.includes('有料老人') || serviceType.includes('サービス付き')) {
    return mapServiceStyles.home
  }
  if (serviceType.includes('短期入所')) return mapServiceStyles.shortStay
  if (serviceType.includes('居宅介護支援')) return mapServiceStyles.carePlan
  if (serviceType.includes('小規模多機能') || serviceType.includes('定期巡回') || serviceType.includes('夜間対応')) return mapServiceStyles.multi
  if (serviceType.includes('地域包括')) return mapServiceStyles.support
  if (serviceType.includes('看護') || serviceType.includes('リハビリ')) return mapServiceStyles.visit
  return mapServiceStyles.default
}

function getFallbackMarkerIcon(serviceType?: string | null) {
  const icon = getMapServiceStyle(serviceType).icon
  const icons = {
    building: Building2,
    home: Home,
    heart: Heart,
    stethoscope: Stethoscope,
    users: Users,
    hand: HandHelping,
    truck: Truck,
    armchair: Armchair,
    clipboard: ClipboardList,
  } as const

  return icons[icon as keyof typeof icons] || Building2
}

function loadGoogleMaps(apiKey: string) {
  const mapsWindow = window as GoogleMapsWindow
  if (mapsWindow.google?.maps?.Map) {
    return Promise.resolve()
  }

  if (!mapsWindow.__caresGoogleMapsPromise) {
    mapsWindow.__caresGoogleMapsPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-cares-google-maps]')
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true })
        existingScript.addEventListener('error', () => reject(new Error('Google Maps failed to load')), { once: true })
        return
      }

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=marker&v=weekly`
      script.async = true
      script.defer = true
      script.dataset.caresGoogleMaps = 'true'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Google Maps failed to load'))
      document.head.appendChild(script)
    })
  }

  return mapsWindow.__caresGoogleMapsPromise
}

function createMarkerContent(facility: FacilityMapItem, active: boolean) {
  const style = getMapServiceStyle(facility.service_type)
  const svgPath = markerSvgPaths[style.icon] || markerSvgPaths.building
  const node = document.createElement('div')
  node.className = `cares-google-marker ${active ? 'is-active' : ''}`
  node.style.setProperty('--marker-color', style.color)
  node.style.setProperty('--marker-soft', style.soft)
  node.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${svgPath}
    </svg>
  `
  node.title = facility.facility_name
  node.setAttribute('aria-label', `${facility.facility_name}を選択`)
  return node
}

export default function FacilityMapPreview({ facilities, area, userLatitude, userLongitude }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const visibleFacilities = useMemo(() => facilities.slice(0, 18), [facilities])
  const [activeId, setActiveId] = useState(visibleFacilities[0]?.id || '')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)
  const [googleError, setGoogleError] = useState(false)
  const [selectedArea, setSelectedArea] = useState(area?.split(':')[0] || '')
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geocodedCoordinates, setGeocodedCoordinates] = useState<Record<string, { lat: number; lng: number }>>({})
  const googleMapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({
    pointerId: 0,
    startX: 0,
    startY: 0,
    panX: 0,
    panY: 0,
  })

  useEffect(() => {
    setSelectedArea(area?.split(':')[0] || '')
  }, [area])

  useEffect(() => {
    if (!visibleFacilities.some((facility) => facility.id === activeId)) {
      setActiveId(visibleFacilities[0]?.id || '')
    }
  }, [activeId, visibleFacilities])

  const mapItems = useMemo(() => {
    const points = visibleFacilities.map((facility) => {
      const latitude = parseCoordinate(facility.latitude) ?? geocodedCoordinates[facility.id]?.lat
      const longitude = parseCoordinate(facility.longitude) ?? geocodedCoordinates[facility.id]?.lng
      const hasExactCoordinate = latitude !== null && longitude !== null
      const base = getPrefecture(facility.address) || getPrefecture(area || '') || prefectureCoordinates[12]
      const jitterX = hasExactCoordinate ? 0 : (hashToUnit(`${facility.id}:x`) - 0.5) * 1.4
      const jitterY = hasExactCoordinate ? 0 : (hashToUnit(`${facility.id}:y`) - 0.5) * 1.1
      return {
        facility,
        lat: hasExactCoordinate ? Number(latitude) : base.lat + jitterY,
        lng: hasExactCoordinate ? Number(longitude) : base.lng + jitterX,
      }
    })

    if (points.length === 0) return []

    const minLat = Math.min(...points.map((point) => point.lat))
    const maxLat = Math.max(...points.map((point) => point.lat))
    const minLng = Math.min(...points.map((point) => point.lng))
    const maxLng = Math.max(...points.map((point) => point.lng))
    const latRange = Math.max(maxLat - minLat, 0.8)
    const lngRange = Math.max(maxLng - minLng, 0.8)

    return points.map((point) => ({
      ...point,
      x: clamp(((point.lng - minLng) / lngRange) * 78 + 11, 8, 92),
      y: clamp((1 - (point.lat - minLat) / latRange) * 68 + 16, 10, 86),
    }))
  }, [area, geocodedCoordinates, visibleFacilities])

  useEffect(() => {
    if (!googleReady) return

    const targets = visibleFacilities
      .filter((facility) => {
        const hasStoredCoordinate =
          parseCoordinate(facility.latitude) !== null && parseCoordinate(facility.longitude) !== null
        return !hasStoredCoordinate && !geocodedCoordinates[facility.id] && facility.address
      })
      .slice(0, 10)
      .map((facility) => ({ id: facility.id, address: facility.address }))

    if (targets.length === 0) return

    let cancelled = false
    const mapsWindow = window as GoogleMapsWindow
    const google = mapsWindow.google
    const geocoder = google?.maps?.Geocoder ? new google.maps.Geocoder() : null

    if (!geocoder) return

    Promise.all(
      targets.map(
        (facility) =>
          new Promise<{ id: string | undefined; address: string | null | undefined; latitude: number; longitude: number } | null>((resolve) => {
            geocoder.geocode({ address: facility.address, region: 'JP' }, (results: any, status: string) => {
              const location = results?.[0]?.geometry?.location
              if (status !== 'OK' || !location) {
                resolve(null)
                return
              }

              resolve({
                id: facility.id,
                address: facility.address,
                latitude: location.lat(),
                longitude: location.lng(),
              })
            })
          })
      )
    )
      .then((geocodedFacilities) => {
        if (cancelled) return
        const successfulFacilities = geocodedFacilities.filter(Boolean)

        const nextCoordinates: Record<string, { lat: number; lng: number }> = {}
        for (const facility of successfulFacilities) {
          if (facility?.id) {
            nextCoordinates[facility.id] = { lat: facility.latitude, lng: facility.longitude }
          }
        }

        if (Object.keys(nextCoordinates).length > 0) {
          setGeocodedCoordinates((current) => ({ ...current, ...nextCoordinates }))
        }

        if (successfulFacilities.length > 0) {
          fetch('/api/directory/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ facilities: successfulFacilities }),
          }).catch(() => undefined)
        }
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [geocodedCoordinates, googleReady, visibleFacilities])

  useEffect(() => {
    if (!googleMapsApiKey || !googleMapRef.current || mapItems.length === 0) return

    let cancelled = false

    loadGoogleMaps(googleMapsApiKey)
      .then(() => {
        if (cancelled || !googleMapRef.current) return

        const mapsWindow = window as GoogleMapsWindow
        const google = mapsWindow.google
        if (!google?.maps?.Map) {
          setGoogleError(true)
          return
        }

        const firstPoint = mapItems[0]
        const hasUserPosition = userLatitude !== null && userLatitude !== undefined && userLongitude !== null && userLongitude !== undefined
        const center = hasUserPosition
          ? { lat: userLatitude, lng: userLongitude }
          : { lat: firstPoint.lat, lng: firstPoint.lng }
        const latValues = mapItems.map((item) => item.lat)
        const lngValues = mapItems.map((item) => item.lng)
        const latSpread = Math.max(...latValues) - Math.min(...latValues)
        const lngSpread = Math.max(...lngValues) - Math.min(...lngValues)
        const shouldFitAllPins = Boolean(area) || (latSpread < 1.8 && lngSpread < 1.8)
        const map = new google.maps.Map(googleMapRef.current, {
          center,
          zoom: shouldFitAllPins ? 12 : 13,
          mapId: googleMapsMapId,
          clickableIcons: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          cameraControl: false,
          zoomControl: true,
        })
        setGoogleError(false)
        setGoogleReady(true)
        const bounds = new google.maps.LatLngBounds()

        try {
          if (hasUserPosition) {
            new google.maps.Marker({
              map,
              position: center,
              title: '現在地',
              label: '現在地',
            })
            bounds.extend(center)
          }

          mapItems.forEach(({ facility, lat, lng }) => {
            const position = { lat, lng }
            bounds.extend(position)
            if (google.maps.marker?.AdvancedMarkerElement) {
              const marker = new google.maps.marker.AdvancedMarkerElement({
                map,
                position,
                title: facility.facility_name,
                content: createMarkerContent(facility, facility.id === activeId),
              })
              marker.addEventListener('gmp-click', () => {
                setActiveId(facility.id)
                map.panTo(position)
              })
            } else {
              const style = getMapServiceStyle(facility.service_type)
              const marker = new google.maps.Marker({
                map,
                position,
                title: facility.facility_name,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: style.color,
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 3,
                  scale: facility.id === activeId ? 11 : 9,
                },
              })
              marker.addListener('click', () => {
                setActiveId(facility.id)
                map.panTo(position)
              })
            }
          })

          if (shouldFitAllPins && mapItems.length > 1) {
            map.fitBounds(bounds, 58)
          }
        } catch (markerError) {
          console.warn('Google Maps marker rendering failed:', markerError)
        }
      })
      .catch(() => setGoogleError(true))

    return () => {
      cancelled = true
    }
  }, [activeId, area, mapItems, userLatitude, userLongitude])

  const activeFacility =
    mapItems.find((item) => item.facility.id === activeId)?.facility ||
    visibleFacilities[0]
  const showGoogleMap = Boolean(googleMapsApiKey)

  if (visibleFacilities.length === 0) return null

  function updateZoom(nextZoom: number) {
    setZoom(clamp(Math.round(nextZoom * 10) / 10, 0.8, 2.4))
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging || dragRef.current.pointerId !== event.pointerId) return
    const nextX = dragRef.current.panX + event.clientX - dragRef.current.startX
    const nextY = dragRef.current.panY + event.clientY - dragRef.current.startY
    const limit = 110 * zoom
    setPan({
      x: clamp(nextX, -limit, limit),
      y: clamp(nextY, -limit, limit),
    })
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current.pointerId === event.pointerId) {
      setIsDragging(false)
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault()
    updateZoom(zoom + (event.deltaY > 0 ? -0.1 : 0.1))
  }

  function resetMap() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  function applyArea(nextArea = selectedArea) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', 'facilities')
    params.delete('page')
    params.delete('lat')
    params.delete('lng')

    if (nextArea) {
      params.set('area', nextArea)
      localStorage.setItem(PREFERRED_AREA_KEY, nextArea)
      localStorage.removeItem(PREFERRED_LAT_KEY)
      localStorage.removeItem(PREFERRED_LNG_KEY)
    } else {
      params.delete('area')
      localStorage.removeItem(PREFERRED_AREA_KEY)
      localStorage.removeItem(PREFERRED_LAT_KEY)
      localStorage.removeItem(PREFERRED_LNG_KEY)
    }

    router.push(`/?${params.toString()}`)
  }

  function handleGeolocationSearch() {
    if (!navigator.geolocation) {
      setGeoError('このブラウザでは現在地を取得できません')
      return
    }

    setGeoLoading(true)
    setGeoError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const area = await resolveAreaFromCoordinates(latitude, longitude)
        const params = new URLSearchParams(searchParams.toString())
        params.set('view', 'facilities')
        params.set('area', area)
        params.set('lat', latitude.toFixed(6))
        params.set('lng', longitude.toFixed(6))
        params.delete('page')

        localStorage.setItem(PREFERRED_AREA_KEY, area)
        localStorage.setItem(PREFERRED_LAT_KEY, latitude.toFixed(6))
        localStorage.setItem(PREFERRED_LNG_KEY, longitude.toFixed(6))

        setSelectedArea(area.split(':')[0] || area)
        setGeoLoading(false)
        router.push(`/?${params.toString()}`)
      },
      () => {
        setGeoLoading(false)
        setGeoError('現在地を取得できませんでした。ブラウザの位置情報許可をご確認ください。')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cares-50 text-cares-700">
            <MapPinned className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-950">地図から近くの事業所を見る</h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {area ? `${area.replace(':', ' / ')} 周辺` : '表示中の事業所'}・評価つき
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {showGoogleMap ? 'Google Maps' : `${visibleFacilities.length}件`}
        </span>
      </div>

      <div className="border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-950">
              {userLatitude && userLongitude
                ? '現在地に近い順で表示しています'
                : area
                  ? `${area.replace(':', ' / ')} 周辺を表示しています`
                  : '現在地またはエリアを指定して探せます'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              ここで選んだ条件は、地図と下の事業所一覧の両方に反映されます。
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch xl:justify-end">
            <button
              type="button"
              onClick={handleGeolocationSearch}
              disabled={geoLoading}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-cares-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-cares-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Navigation className="h-4 w-4 shrink-0" />
              {geoLoading ? '現在地を取得中' : '現在地から探す'}
            </button>

            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 sm:w-[19rem]">
              <select
                value={selectedArea}
                onChange={(event) => setSelectedArea(event.target.value)}
                className="min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-cares-500 focus:ring-4 focus:ring-cares-100"
              >
                <option value="">全国</option>
                {prefectureCoordinates.map((prefecture) => (
                  <option key={prefecture.name} value={prefecture.name}>
                    {prefecture.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => applyArea()}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:border-cares-200 hover:bg-cares-50 hover:text-cares-800"
              >
                <Search className="h-4 w-4 shrink-0" />
                表示
              </button>
            </div>
          </div>
        </div>
        {geoError && <p className="mt-2 text-xs font-semibold text-red-500">{geoError}</p>}
      </div>

      <div
        className={`relative h-[26rem] overflow-hidden bg-[#edf4ef] sm:h-[31rem] ${
          showGoogleMap ? '' : `touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`
        }`}
        onPointerDown={showGoogleMap ? undefined : handlePointerDown}
        onPointerMove={showGoogleMap ? undefined : handlePointerMove}
        onPointerUp={showGoogleMap ? undefined : handlePointerUp}
        onPointerCancel={showGoogleMap ? undefined : handlePointerUp}
        onWheel={showGoogleMap ? undefined : handleWheel}
      >
        {showGoogleMap ? (
          <>
            <div ref={googleMapRef} className="absolute inset-0" />
            {!googleReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-sm font-bold text-slate-500">
                {googleError ? 'Google Mapsを読み込めませんでした' : 'Google Mapsを読み込み中'}
              </div>
            )}
          </>
        ) : (
          <>
            <div
              className="absolute inset-[-14%] transition-transform duration-100 ease-out"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center',
              }}
            >
              <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />
              <div className="absolute -left-12 top-12 h-24 w-[120%] rotate-[-8deg] rounded-full bg-white/70" />
              <div className="absolute -right-16 bottom-20 h-20 w-[120%] rotate-[11deg] rounded-full bg-white/60" />
              <div className="absolute left-8 top-1/2 h-14 w-[90%] -translate-y-1/2 rotate-[4deg] rounded-full bg-cares-100/80" />

              {mapItems.map(({ facility, x, y }) => {
                const active = facility.id === activeFacility?.id
                const markerStyle = getMapServiceStyle(facility.service_type)
                const MarkerIcon = getFallbackMarkerIcon(facility.service_type)
                return (
                  <button
                    key={facility.id}
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setActiveId(facility.id)}
                    className="absolute z-10 -translate-x-1/2 -translate-y-full cursor-pointer outline-none"
                    style={{ left: `${x}%`, top: `${y}%` }}
                    aria-label={`${facility.facility_name}を選択`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full shadow-lg ring-2 transition-all ${
                        active
                          ? 'scale-110 text-white ring-white'
                          : 'text-white ring-white/80 hover:scale-105'
                      }`}
                      style={{ backgroundColor: markerStyle.color }}
                    >
                      <MarkerIcon className="h-4 w-4" />
                    </span>
                    <span
                      className="mx-auto block h-3 w-3 rotate-45 rounded-sm shadow-md"
                      style={{ backgroundColor: markerStyle.color }}
                    />
                  </button>
                )
              })}
            </div>

            <div className="absolute right-3 top-3 z-30 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <button
                type="button"
                onClick={() => updateZoom(zoom + 0.2)}
                className="flex h-9 w-9 items-center justify-center text-slate-700 transition hover:bg-slate-50"
                aria-label="地図を拡大"
                title="拡大"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => updateZoom(zoom - 0.2)}
                className="flex h-9 w-9 items-center justify-center border-t border-slate-100 text-slate-700 transition hover:bg-slate-50"
                aria-label="地図を縮小"
                title="縮小"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={resetMap}
                className="flex h-9 w-9 items-center justify-center border-t border-slate-100 text-slate-500 transition hover:bg-slate-50"
                aria-label="地図表示をリセット"
                title="リセット"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            <div className="absolute left-3 top-3 z-20 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
              {googleMapsApiKey ? 'Google Mapsを読み込めませんでした' : 'Google Maps APIキー未設定'}
            </div>

            {!googleMapsApiKey && (
              <div className="absolute left-3 top-11 z-20 max-w-[260px] rounded-xl bg-white/90 px-3 py-2 text-[11px] font-medium leading-5 text-slate-600 shadow-sm">
                NEXT_PUBLIC_GOOGLE_MAPS_API_KEYを設定すると、拡大縮小・移動できるGoogle Mapsに切り替わります。
              </div>
            )}
          </>
        )}

        {activeFacility && (
          <a
            href={`/directory/${activeFacility.id}`}
            onPointerDown={(event) => event.stopPropagation()}
            className="absolute bottom-4 left-4 right-4 z-20 rounded-2xl border border-white/70 bg-white/95 p-4 shadow-xl shadow-slate-900/10 backdrop-blur sm:left-auto sm:right-5 sm:w-80"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <ServiceTypeIcon serviceType={activeFacility.service_type} size="sm" className="mt-0.5" />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-bold leading-snug text-slate-950">
                    {activeFacility.facility_name}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">{activeFacility.address || '住所未登録'}</p>
                </div>
              </div>
              {activeFacility.is_owner_verified && (
                <span className="shrink-0 rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  公式
                </span>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-700">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {formatRating(activeFacility.rating_average)}
              </span>
              <span className="font-medium text-slate-500">
                {activeFacility.rating_count > 0 ? `${activeFacility.rating_count}件の評価` : '評価はまだありません'}
              </span>
              {activeFacility.service_type && (
                <span className="ml-auto truncate text-slate-400">{activeFacility.service_type}</span>
              )}
            </div>
          </a>
        )}
      </div>
    </section>
  )
}
