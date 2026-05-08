'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent, WheelEvent } from 'react'
import { MapPinned, Minus, Plus, RotateCcw, Star } from 'lucide-react'

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

function createMarkerContent(facility: FacilityMapItem, index: number) {
  const node = document.createElement('div')
  node.className = 'cares-google-marker'
  node.textContent = facility.rating_average ? formatRating(facility.rating_average) : String(index + 1)
  node.title = facility.facility_name
  return node
}

export default function FacilityMapPreview({ facilities, area, userLatitude, userLongitude }: Props) {
  const visibleFacilities = useMemo(() => facilities.slice(0, 18), [facilities])
  const [activeId, setActiveId] = useState(visibleFacilities[0]?.id || '')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)
  const [googleError, setGoogleError] = useState(false)
  const [geocodedCoordinates, setGeocodedCoordinates] = useState<Record<string, { lat: number; lng: number }>>({})
  const googleMapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({
    pointerId: 0,
    startX: 0,
    startY: 0,
    panX: 0,
    panY: 0,
  })

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

          mapItems.forEach(({ facility, lat, lng }, index) => {
            const position = { lat, lng }
            bounds.extend(position)
            if (google.maps.marker?.AdvancedMarkerElement) {
              const marker = new google.maps.marker.AdvancedMarkerElement({
                map,
                position,
                title: facility.facility_name,
                content: createMarkerContent(facility, index),
              })
              marker.addEventListener('gmp-click', () => setActiveId(facility.id))
            } else {
              const marker = new google.maps.Marker({
                map,
                position,
                title: facility.facility_name,
                label: facility.rating_average ? formatRating(facility.rating_average) : String(index + 1),
              })
              marker.addListener('click', () => setActiveId(facility.id))
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
  }, [area, mapItems, userLatitude, userLongitude])

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

              {mapItems.map(({ facility, x, y }, index) => {
                const active = facility.id === activeFacility?.id
                return (
                  <a
                    key={facility.id}
                    href={`/directory/${facility.id}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onMouseEnter={() => setActiveId(facility.id)}
                    onFocus={() => setActiveId(facility.id)}
                    className="absolute z-10 -translate-x-1/2 -translate-y-full cursor-pointer outline-none"
                    style={{ left: `${x}%`, top: `${y}%` }}
                    aria-label={`${facility.facility_name}を開く`}
                  >
                    <span
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-lg ring-2 transition-all ${
                        active
                          ? 'scale-110 bg-slate-950 text-white ring-white'
                          : 'bg-white text-slate-900 ring-white/80 hover:scale-105'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${facility.is_owner_verified ? 'bg-blue-400' : 'bg-cares-500'}`} />
                      {facility.rating_average ? formatRating(facility.rating_average) : index + 1}
                    </span>
                    <span className={`mx-auto block h-3 w-3 rotate-45 rounded-sm shadow-md ${active ? 'bg-slate-950' : 'bg-white'}`} />
                  </a>
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
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-bold leading-snug text-slate-950">
                  {activeFacility.facility_name}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">{activeFacility.address || '住所未登録'}</p>
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
