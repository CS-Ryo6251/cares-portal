import { NextRequest, NextResponse } from 'next/server'

type AddressComponent = {
  long_name?: string
  types?: string[]
}

const PREFECTURE_COORDINATES: { name: string; lat: number; lng: number }[] = [
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

function findNearestPrefecture(lat: number, lng: number) {
  let nearest = PREFECTURE_COORDINATES[0]
  let minDist = Infinity
  for (const pref of PREFECTURE_COORDINATES) {
    const dist = (pref.lat - lat) ** 2 + (pref.lng - lng) ** 2
    if (dist < minDist) {
      minDist = dist
      nearest = pref
    }
  }
  return nearest.name
}

function findComponent(components: AddressComponent[], types: string[]) {
  return components.find((component) =>
    types.every((type) => component.types?.includes(type)),
  )?.long_name
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const lat = Number(body.lat)
    const lng = Number(body.lng)

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: '緯度経度が不正です' }, { status: 400 })
    }

    const fallbackPrefecture = findNearestPrefecture(lat, lng)
    const apiKey = process.env.GOOGLE_MAPS_GEOCODING_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      return NextResponse.json({ area: fallbackPrefecture, source: 'fallback', reason: 'no_api_key' })
    }

    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      language: 'ja',
      region: 'JP',
      key: apiKey,
    })

    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`, {
      next: { revalidate: 60 * 60 * 24 },
    })

    if (!response.ok) {
      return NextResponse.json({
        area: fallbackPrefecture,
        source: 'fallback',
        reason: `http_${response.status}`,
      })
    }

    const data = await response.json()

    if (data.status && data.status !== 'OK') {
      return NextResponse.json({
        area: fallbackPrefecture,
        source: 'fallback',
        reason: String(data.status).toLowerCase(),
        error: data.error_message || null,
      })
    }

    const components: AddressComponent[] = data.results?.[0]?.address_components || []
    const prefecture = findComponent(components, ['administrative_area_level_1']) || fallbackPrefecture
    const city =
      findComponent(components, ['locality']) ||
      findComponent(components, ['administrative_area_level_2']) ||
      findComponent(components, ['sublocality_level_1'])

    return NextResponse.json({
      area: city ? `${prefecture}:${city}` : prefecture,
      source: 'geocoder',
    })
  } catch (error) {
    console.error('Reverse geocode error:', error)
    return NextResponse.json({ error: '座標の解決に失敗しました' }, { status: 500 })
  }
}
