'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, X } from 'lucide-react'

const prefecturesByRegion = [
  { region: '北海道・東北', prefectures: ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'] },
  { region: '関東', prefectures: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'] },
  { region: '中部', prefectures: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'] },
  { region: '近畿', prefectures: ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'] },
  { region: '中国', prefectures: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'] },
  { region: '四国', prefectures: ['徳島県', '香川県', '愛媛県', '高知県'] },
  { region: '九州・沖縄', prefectures: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'] },
]

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
