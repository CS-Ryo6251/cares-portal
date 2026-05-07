'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, X, Navigation } from 'lucide-react'

const prefecturesByRegion = [
  { region: '北海道・東北', prefectures: ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'] },
  { region: '関東', prefectures: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'] },
  { region: '中部', prefectures: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'] },
  { region: '近畿', prefectures: ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'] },
  { region: '中国', prefectures: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'] },
  { region: '四国', prefectures: ['徳島県', '香川県', '愛媛県', '高知県'] },
  { region: '九州・沖縄', prefectures: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'] },
]

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

function findNearestPrefecture(lat: number, lng: number): string {
  let nearest = prefectureCoordinates[0]
  let minDist = Infinity

  for (const pref of prefectureCoordinates) {
    const dist = (pref.lat - lat) ** 2 + (pref.lng - lng) ** 2
    if (dist < minDist) {
      minDist = dist
      nearest = pref
    }
  }

  return nearest.name
}

export default function AreaFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentArea = searchParams.get('area') || ''
  // Parse current area: could be "福井県" or "福井県:鯖江市,越前市"
  const [prefecture, initialCities] = currentArea.includes(':')
    ? [currentArea.split(':')[0], currentArea.split(':')[1].split(',')]
    : [currentArea, []]

  const [selectedPref, setSelectedPref] = useState(prefecture)
  const [cities, setCities] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>(initialCities.filter(Boolean))
  const [loading, setLoading] = useState(false)
  const [showCities, setShowCities] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const cityRef = useRef<HTMLDivElement>(null)

  // Fetch cities when prefecture changes
  useEffect(() => {
    if (!selectedPref) {
      setCities([])
      setSelectedCities([])
      return
    }

    setLoading(true)
    fetch(`/api/directory/cities?prefecture=${encodeURIComponent(selectedPref)}`)
      .then(res => res.json())
      .then(data => {
        setCities(data.cities || [])
        // Keep only valid selections
        setSelectedCities(prev => prev.filter(c => (data.cities || []).includes(c)))
      })
      .catch(() => setCities([]))
      .finally(() => setLoading(false))
  }, [selectedPref])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setShowCities(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleGeolocationSearch() {
    if (!navigator.geolocation) {
      setGeoError('この端末では位置情報を利用できません')
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const pref = findNearestPrefecture(latitude, longitude)
        const params = new URLSearchParams(searchParams.toString())
        params.set('area', pref)
        params.delete('page')
        router.push(`/?${params.toString()}`)
        setGeoLoading(false)
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError('位置情報の利用が許可されていません')
        } else if (error.code === error.TIMEOUT) {
          setGeoError('位置情報の取得がタイムアウトしました')
        } else {
          setGeoError('位置情報を取得できませんでした')
        }
        setGeoLoading(false)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }

  function applyFilter() {
    const params = new URLSearchParams(searchParams.toString())
    if (selectedPref) {
      if (selectedCities.length > 0) {
        params.set('area', `${selectedPref}:${selectedCities.join(',')}`)
      } else {
        params.set('area', selectedPref)
      }
    } else {
      params.delete('area')
    }
    const qs = params.toString()
    router.push(qs ? `/?${qs}` : '/')
  }

  function toggleCity(city: string) {
    setSelectedCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    )
  }

  return (
    <div className="space-y-2">
      {/* Prefecture dropdown */}
      <div className="flex gap-2">
        <select
          value={selectedPref}
          onChange={(e) => {
            setSelectedPref(e.target.value)
            setSelectedCities([])
            setShowCities(false)
          }}
          className="flex-1 min-w-0 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-medium focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none appearance-none cursor-pointer"
        >
          <option value="">全国</option>
          {prefecturesByRegion.map((group) => (
            <optgroup key={group.region} label={group.region}>
              {group.prefectures.map((pref) => (
                <option key={pref} value={pref}>
                  {pref}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          onClick={applyFilter}
          className="shrink-0 px-3 py-2.5 bg-cares-600 text-white rounded-xl text-sm font-medium hover:bg-cares-700 transition-colors"
        >
          絞込
        </button>
      </div>

      {/* Geolocation search */}
      <button
        onClick={handleGeolocationSearch}
        disabled={geoLoading}
        className="inline-flex items-center gap-1 px-1 py-1 text-xs text-gray-500 hover:text-cares-600 transition-colors disabled:opacity-50"
      >
        <Navigation className="w-3 h-3" />
        {geoLoading ? '取得中...' : '現在地から探す'}
      </button>
      {geoError && (
        <p className="text-xs text-red-500">{geoError}</p>
      )}

      {/* City multi-select */}
      {selectedPref && cities.length > 0 && (
        <div ref={cityRef} className="relative">
          <button
            onClick={() => setShowCities(!showCities)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
          >
            <span className="truncate">
              {selectedCities.length > 0
                ? `${selectedCities.length}件の市区町村を選択中`
                : '市区町村で絞り込む'}
            </span>
            <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${showCities ? 'rotate-180' : ''}`} />
          </button>

          {/* Selected city tags */}
          {selectedCities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedCities.map(city => (
                <span
                  key={city}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-cares-50 text-cares-700 rounded-lg text-xs font-medium"
                >
                  {city}
                  <button onClick={() => toggleCity(city)} className="hover:text-cares-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Dropdown */}
          {showCities && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {loading ? (
                <p className="px-3 py-4 text-sm text-gray-400 text-center">読込中...</p>
              ) : (
                <div className="py-1">
                  {cities.map(city => (
                    <label
                      key={city}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCities.includes(city)}
                        onChange={() => toggleCity(city)}
                        className="w-4 h-4 rounded border-gray-300 text-cares-600 focus:ring-cares-500"
                      />
                      <span className="text-sm text-gray-700">{city}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
