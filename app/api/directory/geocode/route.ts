import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'

type GeocodeRequestFacility = {
  id?: string
  address?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
}

const MAX_GEOCODE_PER_REQUEST = 10

function isValidCoordinate(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

async function geocodeAddress(address: string, apiKey: string) {
  const params = new URLSearchParams({
    address,
    region: 'jp',
    language: 'ja',
    key: apiKey,
  })
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`, {
    next: { revalidate: 60 * 60 * 24 },
  })

  if (!response.ok) {
    return { status: 'HTTP_ERROR', error: `HTTP ${response.status}`, latitude: null, longitude: null }
  }

  const payload = await response.json()
  const firstResult = payload.results?.[0]
  const location = firstResult?.geometry?.location

  if (payload.status !== 'OK' || !location) {
    return {
      status: payload.status || 'NO_RESULT',
      error: payload.error_message || '住所から座標を取得できませんでした',
      latitude: null,
      longitude: null,
    }
  }

  const latitude = Number(location.lat)
  const longitude = Number(location.lng)

  if (!isValidCoordinate(latitude, longitude)) {
    return { status: 'INVALID_COORDINATE', error: '取得した座標が不正です', latitude: null, longitude: null }
  }

  return { status: 'OK', error: null, latitude, longitude }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_GEOCODING_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    const body = await request.json()
    const facilities = Array.isArray(body.facilities)
      ? (body.facilities as GeocodeRequestFacility[])
      : []
    const targets = facilities
      .filter((facility) => facility.id && facility.address)
      .slice(0, MAX_GEOCODE_PER_REQUEST)

    if (targets.length === 0) {
      return NextResponse.json({ results: [] })
    }

    const supabase = getSupabaseServiceClient()
    const results = []

    for (const target of targets) {
      const suppliedLatitude = Number(target.latitude)
      const suppliedLongitude = Number(target.longitude)
      const hasSuppliedCoordinate = isValidCoordinate(suppliedLatitude, suppliedLongitude)
      const geocode = hasSuppliedCoordinate
        ? { status: 'OK', error: null, latitude: suppliedLatitude, longitude: suppliedLongitude }
        : apiKey
          ? await geocodeAddress(target.address!, apiKey)
          : { status: 'NO_API_KEY', error: 'Google Maps APIキーが未設定です', latitude: null, longitude: null }
      const updatePayload =
        geocode.status === 'OK'
          ? {
              latitude: geocode.latitude,
              longitude: geocode.longitude,
              geocoded_at: new Date().toISOString(),
              geocode_status: 'ok',
              geocode_error: null,
            }
          : {
              geocoded_at: new Date().toISOString(),
              geocode_status: geocode.status.toLowerCase(),
              geocode_error: geocode.error,
            }

      const { error: updateError } = await supabase
        .from('cares_listings')
        .update(updatePayload)
        .eq('id', target.id)

      results.push({
        id: target.id,
        latitude: geocode.latitude,
        longitude: geocode.longitude,
        status: geocode.status,
        saved: !updateError,
        error: updateError?.message || geocode.error,
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Listing geocode error:', error)
    return NextResponse.json({ error: '座標の取得に失敗しました' }, { status: 500 })
  }
}
