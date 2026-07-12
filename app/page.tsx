import { getSupabaseClient } from '@/lib/supabase'
import { ArrowRight, BadgeCheck, HeartHandshake, Search, Sparkles, Star } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import PostCard from '@/components/PostCard'
import GeolocationBanner from '@/components/GeolocationBanner'
import AreaPreferenceRedirect from '@/components/AreaPreferenceRedirect'
import FacilityMapPreview from '@/components/FacilityMapPreview'
import ServiceTypeIcon from '@/components/ServiceTypeIcon'
import CompletenessBar from '@/components/CompletenessBar'
import FilterChipLink from '@/components/FilterChipLink'
import { vacancyStatusMap } from '@/lib/constants'

const postCategories = [
  { key: '', label: 'すべて' },
  { key: 'daily', label: '日常' },
  { key: 'notice', label: 'お知らせ' },
  { key: 'event', label: 'イベント' },
  { key: 'availability', label: '空き情報' },
  { key: 'recruitment', label: '求人' },
  { key: 'staff', label: 'スタッフ紹介' },
  { key: 'volunteer', label: 'ボランティア' },
  { key: 'other', label: 'その他' },
]

const serviceTypeFilters = [
  { key: '', label: 'すべて' },
  { key: '居宅介護支援', label: '居宅介護支援' },
  { key: '通所介護', label: 'デイサービス' },
  { key: '介護老人福祉施設', label: '特養' },
  { key: '介護老人保健施設', label: '老健' },
  { key: '認知症対応型共同生活介護', label: 'グループホーム' },
  { key: '訪問介護', label: '訪問介護' },
  { key: '訪問看護', label: '訪問看護' },
  { key: '小規模多機能型居宅介護', label: '小規模多機能' },
  { key: '短期入所生活介護', label: 'ショートステイ' },
]

function calculateScore(post: any, userArea: string | undefined): number {
  // 鮮度スコア (40%)
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60)
  let freshnessScore = 0
  if (ageHours < 24) freshnessScore = 100
  else if (ageHours < 72) freshnessScore = 80
  else if (ageHours < 168) freshnessScore = 60  // 7日
  else if (ageHours < 720) freshnessScore = 30  // 30日
  else freshnessScore = 10

  // エリア近接スコア (25%)
  let areaScore = 50 // デフォルト（エリア未指定時）
  if (userArea) {
    const facilityAddress = post.facility_portal_profiles?.facilities?.address || ''
    if (facilityAddress.includes(userArea)) areaScore = 100
    else areaScore = 20
  }

  // エンゲージメントスコア (15%)
  const views = post.view_count || 0
  const favorites = post.favorite_count || 0
  const engagementRaw = views + favorites * 5
  const engagementScore = Math.min(100, engagementRaw / 2)

  // 受入状況スコア (10%)
  const acceptanceStatus = post.facility_portal_profiles?.acceptance_status || 'unknown'
  const acceptanceScores: Record<string, number> = {
    accepting: 100,
    limited: 70,
    waitlist: 40,
    not_accepting: 10,
    unknown: 30,
  }
  const acceptScore = acceptanceScores[acceptanceStatus] || 30

  return (
    freshnessScore * 0.4 +
    areaScore * 0.25 +
    engagementScore * 0.15 +
    acceptScore * 0.1
  )
}

function applyDiversityShuffle(posts: any[]): any[] {
  if (posts.length <= 1) return posts

  const result: any[] = [posts[0]]
  const remaining = posts.slice(1)

  for (let i = 0; i < remaining.length; i++) {
    const candidate = remaining[i]
    const recentInResult = result.slice(-2)

    // 同じ施設が3連続しないようチェック
    const sameFacilityCount = recentInResult.filter(
      (p: any) => p.facility_id === candidate.facility_id
    ).length
    if (sameFacilityCount >= 2) {
      // 後ろにずらす（次の異なる施設/カテゴリの投稿を先に入れる）
      const swapIdx = remaining.slice(i + 1).findIndex(
        (p: any) => p.facility_id !== candidate.facility_id && p.category !== candidate.category
      )
      if (swapIdx !== -1) {
        const actualIdx = i + 1 + swapIdx
        ;[remaining[i], remaining[actualIdx]] = [remaining[actualIdx], remaining[i]]
        result.push(remaining[i])
        continue
      }
    }

    // 同じカテゴリが3連続しないようチェック
    const sameCategoryCount = recentInResult.filter(
      (p: any) => p.category === candidate.category
    ).length
    if (sameCategoryCount >= 2) {
      const swapIdx = remaining.slice(i + 1).findIndex(
        (p: any) => p.category !== candidate.category
      )
      if (swapIdx !== -1) {
        const actualIdx = i + 1 + swapIdx
        ;[remaining[i], remaining[actualIdx]] = [remaining[actualIdx], remaining[i]]
        result.push(remaining[i])
        continue
      }
    }

    result.push(candidate)
  }

  return result
}

async function getFeedPosts(searchParams: { [key: string]: string | undefined }) {
  const supabase = getSupabaseClient()

  let query = supabase
    .from('facility_portal_posts')
    .select(`
      id,
      facility_id,
      title,
      content,
      category,
      link_url,
      view_count,
      favorite_count,
      created_at,
      facility_portal_post_media (
        id, media_url, media_type, sort_order
      ),
      facility_portal_profiles!inner (
        acceptance_status,
        is_published,
        phone,
        icon_url,
        facilities!inner (
          name, address, service_type, phone
        )
      )
    `)
    .eq('status', 'published')
    .eq('facility_portal_profiles.is_published', true)
    .order('created_at', { ascending: false })
    .limit(30)

  if (searchParams.category) {
    if (searchParams.category === 'event') {
      query = query.in('category', ['event', 'training'])
    } else {
      query = query.eq('category', searchParams.category)
    }
  }

  if (searchParams.area) {
    const area = searchParams.area
    if (area.includes(':')) {
      // Prefecture:city1,city2 format — filter by each city
      const [pref, citiesStr] = area.split(':')
      const cities = citiesStr.split(',').filter(Boolean)
      if (cities.length > 0) {
        // OR filter: address contains any of the cities
        const cityFilters = cities.map(c => `address.ilike.%${pref}${c}%`).join(',')
        query = query.or(cityFilters, { referencedTable: 'facility_portal_profiles.facilities' })
      } else {
        query = query.ilike('facility_portal_profiles.facilities.address', `%${pref}%`)
      }
    } else {
      query = query.ilike('facility_portal_profiles.facilities.address', `%${area}%`)
    }
  }

  if (searchParams.status) {
    const statusMap: Record<string, string[]> = {
      has_vacancy: ['has_vacancy', 'accepting'],
      no_vacancy: ['no_vacancy', 'not_accepting'],
      unknown: ['unknown', 'limited', 'waitlist'],
    }
    const values = statusMap[searchParams.status] || [searchParams.status]
    query = query.in('facility_portal_profiles.acceptance_status', values)
  }

  const { data, error } = await query

  if (error) {
    console.error('Feed取得エラー:', error)
    return []
  }

  let posts = (data || []) as any[]

  // フリーワード検索（クライアント側フィルタ）
  if (searchParams.q) {
    const q = searchParams.q.toLowerCase()
    posts = posts.filter((post) => {
      const profile = post.facility_portal_profiles
      const facility = profile?.facilities
      return (
        post.title?.toLowerCase().includes(q) ||
        post.content?.toLowerCase().includes(q) ||
        facility?.name?.toLowerCase().includes(q)
      )
    })
  }

  // ソートモードに応じた並び替え
  const sortMode = searchParams.sort || 'recommended'

  if (sortMode === 'recommended') {
    // スコアリングで並び替え
    const userArea = searchParams.area
    posts.sort((a, b) => calculateScore(b, userArea) - calculateScore(a, userArea))
    // カテゴリ多様性シャッフル
    posts = applyDiversityShuffle(posts)
  } else if (sortMode === 'popular') {
    // 人気順: view_count + favorite_count * 5 DESC
    posts.sort((a, b) => {
      const scoreA = (a.view_count || 0) + (a.favorite_count || 0) * 5
      const scoreB = (b.view_count || 0) + (b.favorite_count || 0) * 5
      return scoreB - scoreA
    })
  }
  // newest: created_at DESC はSupabaseクエリのデフォルト順のまま

  // PostCard用にデータをマッピング
  return posts.map((post) => {
    const profile = post.facility_portal_profiles
    const facility = profile.facilities
    return {
      post: {
        id: post.id,
        facility_id: post.facility_id,
        title: post.title,
        content: post.content,
        category: post.category,
        link_url: post.link_url,
        view_count: post.view_count || 0,
        favorite_count: post.favorite_count || 0,
        created_at: post.created_at,
        facility_portal_post_media: post.facility_portal_post_media || [],
      },
      facility: {
        name: facility.name,
        address: facility.address,
        facility_type: facility.service_type,
        icon_url: profile.icon_url || null,
      },
      acceptanceStatus: profile.acceptance_status,
    }
  })
}

const FACILITIES_PER_PAGE = 50

function parseCoordinate(value: string | undefined) {
  if (!value) return null
  const coordinate = Number(value)
  return Number.isFinite(coordinate) ? coordinate : null
}

function calculateDistanceKm(fromLat: number, fromLng: number, toLat: number | null, toLng: number | null) {
  if (toLat === null || toLng === null) return Number.POSITIVE_INFINITY
  const earthRadiusKm = 6371
  const latDelta = ((toLat - fromLat) * Math.PI) / 180
  const lngDelta = ((toLng - fromLng) * Math.PI) / 180
  const startLat = (fromLat * Math.PI) / 180
  const endLat = (toLat * Math.PI) / 180
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

async function getFacilities(searchParams: { [key: string]: string | undefined }): Promise<{
  facilities: any[]
  totalCount: number
  page: number
  totalPages: number
}> {
  const supabase = getSupabaseClient()
  const page = Math.max(1, parseInt(searchParams.page || '1', 10))
  const from = (page - 1) * FACILITIES_PER_PAGE
  const to = from + FACILITIES_PER_PAGE - 1
  const userLatitude = parseCoordinate(searchParams.lat)
  const userLongitude = parseCoordinate(searchParams.lng)
  const hasUserLocation = userLatitude !== null && userLongitude !== null

  let query = supabase
    .from('cares_listings')
    .select('*', { count: 'estimated' })
    .order('is_owner_verified', { ascending: false })
    .order('completeness_score', { ascending: false, nullsFirst: false })
    .order('facility_name', { ascending: true })

  if (searchParams.area) {
    const area = searchParams.area
    if (area.includes(':')) {
      const [pref, citiesStr] = area.split(':')
      const cities = citiesStr.split(',').filter(Boolean)
      if (cities.length > 0) {
        const cityFilters = cities.map(c => `address.ilike.%${pref}${c}%`).join(',')
        query = query.or(cityFilters)
      } else {
        query = query.ilike('address', `%${pref}%`)
      }
    } else {
      query = query.ilike('address', `%${area}%`)
    }
  }

  if (searchParams.status) {
    const statusMap: Record<string, string[]> = {
      has_vacancy: ['has_vacancy', 'accepting'],
      no_vacancy: ['no_vacancy', 'not_accepting'],
      unknown: ['unknown', 'limited', 'waitlist'],
    }
    const values = statusMap[searchParams.status] || [searchParams.status]
    query = query.in('acceptance_status', values)
  }

  // サービス種別フィルター
  if (searchParams.service_type) {
    query = query.eq('service_type', searchParams.service_type)
  }

  // フリーワード検索（サーバー側フィルタ）
  if (searchParams.q) {
    const q = searchParams.q
    query = query.or(`facility_name.ilike.%${q}%,address.ilike.%${q}%`)
  }

  if (hasUserLocation) {
    query = query.limit(Math.max(to + 1, 250))
  } else {
    query = query.range(from, to)
  }

  const queryResult = await query
  let data = queryResult.data
  const error = queryResult.error
  let count = queryResult.count

  if (error) {
    console.error('施設取得エラー:', error)
    const fallback = await supabase
      .from('cares_listings')
      .select('*')
      .limit(FACILITIES_PER_PAGE)

    if (fallback.error) {
      console.error('施設フォールバック取得エラー:', fallback.error)
      return { facilities: [], totalCount: 0, page, totalPages: 0 }
    }

    data = fallback.data
    count = fallback.data?.length || 0
  }

  let rawData = data || []
  if (hasUserLocation) {
    rawData = [...rawData]
      .map((item: any) => ({
        ...item,
        distance_km: calculateDistanceKm(
          userLatitude,
          userLongitude,
          parseCoordinate(item.latitude),
          parseCoordinate(item.longitude)
        ),
      }))
      .sort((a: any, b: any) => {
        if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km
        if (a.is_owner_verified !== b.is_owner_verified) return a.is_owner_verified ? -1 : 1
        return (b.completeness_score || 0) - (a.completeness_score || 0)
      })
      .slice(from, to + 1)
  }

  const totalCount = count || 0
  const totalPages = Math.ceil(totalCount / FACILITIES_PER_PAGE)

  const listingIds = rawData.map((item: any) => item.id)
  const ratingStats: Record<string, { sum: number; count: number }> = {}

  if (listingIds.length > 0) {
    const { data: ratings, error: ratingError } = await supabase
      .from('cares_user_ratings')
      .select('listing_id, rating')
      .in('listing_id', listingIds)

    if (!ratingError) {
      for (const rating of ratings || []) {
        const listingId = (rating as any).listing_id
        if (!ratingStats[listingId]) ratingStats[listingId] = { sum: 0, count: 0 }
        ratingStats[listingId].sum += Number((rating as any).rating || 0)
        ratingStats[listingId].count += 1
      }
    }
  }

  const facilities = rawData.map((item: any) => {
    const stats = ratingStats[item.id]
    const ratingAverage = stats?.count ? Math.round((stats.sum / stats.count) * 10) / 10 : null

    return {
      id: item.id,
      facility_name: item.facility_name,
      service_type: item.service_type,
      address: item.address,
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      acceptance_status: item.acceptance_status,
      is_owner_verified: item.is_owner_verified,
      source: item.source,
      completeness_score: item.completeness_score || 0,
      completeness_tier: item.completeness_tier || 'insufficient',
      rating_average: ratingAverage,
      rating_count: stats?.count || 0,
      distance_km: item.distance_km ?? null,
    }
  })

  return { facilities, totalCount, page, totalPages }
}

function buildCategoryUrl(currentParams: { [key: string]: string | undefined }, category: string) {
  const params = new URLSearchParams()
  if (currentParams.view) params.set('view', currentParams.view)
  if (currentParams.area) params.set('area', currentParams.area)
  if (currentParams.lat) params.set('lat', currentParams.lat)
  if (currentParams.lng) params.set('lng', currentParams.lng)
  if (currentParams.status) params.set('status', currentParams.status)
  if (currentParams.q) params.set('q', currentParams.q)
  if (currentParams.service_type) params.set('service_type', currentParams.service_type)
  if (category) params.set('category', category)
  const qs = params.toString()
  return qs ? `/?${qs}` : '/'
}

function buildServiceTypeUrl(currentParams: { [key: string]: string | undefined }, serviceType: string) {
  const params = new URLSearchParams()
  if (currentParams.view) params.set('view', currentParams.view)
  if (currentParams.area) params.set('area', currentParams.area)
  if (currentParams.lat) params.set('lat', currentParams.lat)
  if (currentParams.lng) params.set('lng', currentParams.lng)
  if (currentParams.status) params.set('status', currentParams.status)
  if (currentParams.q) params.set('q', currentParams.q)
  if (serviceType) params.set('service_type', serviceType)
  // ページをリセット
  const qs = params.toString()
  return qs ? `/?${qs}` : '/'
}

function ActiveFilters({ params }: { params: { [key: string]: string | undefined } }) {
  const filters: { key: string; label: string; value: string }[] = []
  const hasLocation = Boolean(params.lat && params.lng)

  if (params.category) {
    const cat = postCategories.find((c) => c.key === params.category)
    filters.push({ key: 'category', label: 'カテゴリ', value: cat?.label || params.category })
  }
  if (params.service_type) {
    const st = serviceTypeFilters.find((s) => s.key === params.service_type)
    filters.push({ key: 'service_type', label: 'サービス種別', value: st?.label || params.service_type })
  }
  if (hasLocation) {
    filters.push({
      key: 'location',
      label: '現在地',
      value: params.area ? `${params.area.replace(':', ' / ')} 周辺` : '現在地周辺',
    })
  } else if (params.area) {
    filters.push({ key: 'area', label: 'エリア', value: params.area.replace(':', ' / ') })
  }
  if (params.status) {
    const statusInfo = vacancyStatusMap[params.status]
    filters.push({ key: 'status', label: '受入状況', value: statusInfo?.label || params.status })
  }
  if (params.q) {
    filters.push({ key: 'q', label: '検索', value: params.q })
  }

  if (filters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      <span className="text-sm text-gray-500">絞り込み:</span>
      {filters.map((filter) => {
        const newParams = new URLSearchParams()
        Object.entries(params).forEach(([k, v]) => {
          if (v && k !== filter.key) newParams.set(k, v)
        })
        if (filter.key === 'location') {
          newParams.delete('area')
          newParams.delete('lat')
          newParams.delete('lng')
        }
        if (filter.key === 'area') {
          newParams.delete('lat')
          newParams.delete('lng')
        }
        const qs = newParams.toString()
        const href = qs ? `/?${qs}` : '/'
        return (
          <FilterChipLink
            key={filter.key}
            href={href}
            clearLocation={filter.key === 'location' || filter.key === 'area'}
          >
            {filter.value}
          </FilterChipLink>
        )
      })}
      {filters.length > 1 && (
        <FilterChipLink
          href={params.view ? `/?view=${params.view}` : '/'}
          clearLocation
          className="text-sm text-gray-400 hover:text-gray-600 ml-1"
        >
          すべてクリア
        </FilterChipLink>
      )}
    </div>
  )
}

function buildTabUrl(currentParams: { [key: string]: string | undefined }, view: string) {
  const params = new URLSearchParams()
  if (view === 'posts') params.set('view', 'posts')
  // Preserve q, area, status, service_type — reset category and sort when switching tabs
  if (currentParams.q) params.set('q', currentParams.q)
  if (currentParams.area) params.set('area', currentParams.area)
  if (currentParams.lat) params.set('lat', currentParams.lat)
  if (currentParams.lng) params.set('lng', currentParams.lng)
  if (currentParams.status) params.set('status', currentParams.status)
  if (currentParams.service_type) params.set('service_type', currentParams.service_type)
  const qs = params.toString()
  return qs ? `/?${qs}` : '/'
}

function buildPageUrl(currentParams: { [key: string]: string | undefined }, page: number) {
  const params = new URLSearchParams()
  if (currentParams.view) params.set('view', currentParams.view)
  if (currentParams.area) params.set('area', currentParams.area)
  if (currentParams.lat) params.set('lat', currentParams.lat)
  if (currentParams.lng) params.set('lng', currentParams.lng)
  if (currentParams.status) params.set('status', currentParams.status)
  if (currentParams.q) params.set('q', currentParams.q)
  if (currentParams.service_type) params.set('service_type', currentParams.service_type)
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return qs ? `/?${qs}` : '/'
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  const currentSort = params.sort || 'recommended'
  const currentView = params.view || 'facilities'
  const userLatitude = parseCoordinate(params.lat)
  const userLongitude = parseCoordinate(params.lng)
  const hasUserLocation = userLatitude !== null && userLongitude !== null

  const posts = currentView === 'posts' ? await getFeedPosts(params) : []
  const facilitiesResult = currentView === 'facilities' ? await getFacilities(params) : { facilities: [], totalCount: 0, page: 1, totalPages: 0 }
  const { facilities, totalCount, page: currentPage, totalPages } = facilitiesResult

  return (
    <div className="flex gap-0">
      <AreaPreferenceRedirect />
      {/* Sidebar - desktop only */}
      <aside className="hidden lg:block w-72 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r border-gray-100 bg-white">
        <Sidebar searchParams={params} />
      </aside>

      {/* Feed */}
      <div className="min-w-0 w-full flex-1 max-w-3xl mx-auto px-4 py-6 sm:py-8">
        {/* Mobile search bar */}
        <div className="lg:hidden mb-4">
          <form method="GET" action="/">
            {/* Preserve existing filters */}
            {currentView === 'posts' && <input type="hidden" name="view" value="posts" />}
            {params.category && <input type="hidden" name="category" value={params.category} />}
            {params.area && <input type="hidden" name="area" value={params.area} />}
            {params.lat && <input type="hidden" name="lat" value={params.lat} />}
            {params.lng && <input type="hidden" name="lng" value={params.lng} />}
            {params.status && <input type="hidden" name="status" value={params.status} />}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="q"
                defaultValue={params.q || ''}
                placeholder="施設名・キーワードで検索"
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none shadow-sm"
              />
            </div>
          </form>
        </div>

        {/* Geolocation banner */}
        <GeolocationBanner />

        {/* Site intro */}
        <div className="relative mb-5 overflow-hidden rounded-[2rem] border border-rose-100 bg-[#fffdfb] p-6 shadow-sm animate-fade-up sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border-[36px] border-rose-50/80" />
          <div className="pointer-events-none absolute bottom-0 right-12 h-px w-48 bg-gradient-to-r from-transparent via-rose-200 to-transparent" />
          <div className="relative">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold tracking-[0.12em] text-rose-700 ring-1 ring-rose-100">
                <Sparkles className="h-3.5 w-3.5" />
                CARES BY CARESPACE
              </p>
              <h1 className="text-3xl font-black leading-[1.2] tracking-tight text-slate-950 sm:text-4xl">
                介護事業所の<span className="whitespace-nowrap">「いま」が、</span>
                <br />ひと目で見つかる。
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                公表データと事業所公式情報に、利用者の口コミや専門職コメントを整理して掲載。空き状況、料金、パンフレットまで、電話する前に確認できます。
              </p>
            </div>
            <a
              href="https://app.carespace.jp/signup/new-organization?source=cares"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-cares-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-rose-200/70 transition hover:-translate-y-0.5 hover:bg-cares-700"
            >
              私たちの事業所も掲載する
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="relative mt-7 grid gap-2.5 sm:grid-cols-3">
            {[
              ['公表DB＋新設事業所', 'OSから新しいページも公開'],
              ['事業所公式情報', '空き・料金・資料を直接更新'],
              ['口コミと専門職コメント', '役割を分けて見やすく表示'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl bg-white px-3 py-3.5 ring-1 ring-slate-100">
                <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800"><BadgeCheck className="h-4 w-4 text-cares-500" />{title}</p>
                <p className="mt-1 text-xs text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>

        <a href="/cases" className="group mb-5 flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-white px-4 py-4 shadow-sm transition hover:border-cares-300 hover:shadow-md sm:px-5">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-cares-600"><HeartHandshake className="h-5 w-5" /></span>
            <span className="min-w-0"><span className="block text-sm font-black text-slate-950">地域の支援案件を見る</span><span className="mt-0.5 block text-xs text-slate-500">事業所名を伏せた受入相談。仲介・成約手数料はかかりません</span></span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-cares-500 transition-transform group-hover:translate-x-1" />
        </a>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 rounded-xl p-1 mb-4">
          <a
            href={buildTabUrl(params, 'facilities')}
            className={`flex-1 text-center px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              currentView === 'facilities'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            施設
          </a>
          <a
            href={buildTabUrl(params, 'posts')}
            className={`flex-1 text-center px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              currentView === 'posts'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            投稿
          </a>
        </div>

        {/* Service type pills — facilities tab */}
        {currentView === 'facilities' && (
        <div className="mb-5 -mx-4 px-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {serviceTypeFilters.map((st) => {
              const isActive = (params.service_type || '') === st.key
              return (
                <a
                  key={st.key}
                  href={buildServiceTypeUrl(params, st.key)}
                  className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-cares-600 text-white shadow-sm shadow-cares-100'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-cares-300 hover:text-cares-700'
                  }`}
                >
                  {st.label}
                </a>
              )
            })}
          </div>
        </div>
        )}

        {/* Mobile category pills — posts tab only */}
        {currentView === 'posts' && (
        <div className="lg:hidden mb-5 -mx-4 px-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {postCategories.map((cat) => {
              const isActive = (params.category || '') === cat.key
              return (
                <a
                  key={cat.key}
                  href={buildCategoryUrl(params, cat.key)}
                  className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-cares-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-cares-300 hover:text-cares-600'
                  }`}
                >
                  {cat.label}
                </a>
              )
            })}
          </div>
        </div>
        )}

        {/* Sort selector — posts tab only */}
        {currentView === 'posts' && (
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { key: 'recommended', label: 'おすすめ' },
            { key: 'newest', label: '新着順' },
            { key: 'popular', label: '人気順' },
          ].map((sort) => {
            const isActive = currentSort === sort.key
            const sortParams = new URLSearchParams()
            // 既存パラメータを維持
            sortParams.set('view', 'posts')
            if (params.category) sortParams.set('category', params.category)
            if (params.area) sortParams.set('area', params.area)
            if (params.status) sortParams.set('status', params.status)
            if (params.q) sortParams.set('q', params.q)
            if (sort.key !== 'recommended') sortParams.set('sort', sort.key)
            const href = sortParams.toString() ? `/?${sortParams.toString()}` : '/'
            return (
              <a
                key={sort.key}
                href={href}
                className={`text-sm font-semibold transition-colors px-3 py-2 rounded-lg ${
                  isActive ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {sort.label}
              </a>
            )
          })}
        </div>
        )}

        {/* Active filters */}
        <ActiveFilters params={params} />

        {/* Post feed */}
        {currentView === 'posts' && (
        <>
          <div className="space-y-6">
            {posts.map((item) => (
              <PostCard
                key={item.post.id}
                post={item.post}
                facility={item.facility}
                acceptanceStatus={item.acceptanceStatus}
              />
            ))}
          </div>

          {/* Empty state */}
          {posts.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-600 mb-2">投稿がありません</p>
              <p className="text-base text-gray-400 mb-6">
                条件を変更して再度お試しください
              </p>
              <a
                href="/"
                className="inline-flex items-center px-5 py-2.5 bg-cares-600 text-white rounded-lg text-base font-medium hover:bg-cares-700 transition-colors"
              >
                すべての投稿を見る
              </a>
            </div>
          )}

          {/* Feed footer */}
          {posts.length > 0 && (
            <div className="text-center py-8 text-sm text-gray-400">
              {posts.length}件の投稿を表示中
            </div>
          )}
        </>
        )}

        {/* Facility list */}
        {currentView === 'facilities' && (
        <>
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-950">
                  {hasUserLocation
                    ? '現在地に近い順で表示しています'
                    : params.area
                      ? `${params.area.replace(':', ' / ')}の事業所`
                      : 'エリアを指定すると近くの事業所を探しやすくなります'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  検索・エリア・サービス種別の条件は、一覧と地図の両方に反映されます。
                </p>
              </div>
              {!hasUserLocation && (
                <span className="text-xs font-semibold text-cares-700">
                  マップ上の「現在地から探す」またはエリア選択を利用できます
                </span>
              )}
            </div>
          </div>

          <FacilityMapPreview
            facilities={facilities}
            area={params.area}
            userLatitude={userLatitude}
            userLongitude={userLongitude}
          />

          <div className="space-y-4">
            {facilities.map((item: any) => (
              <a
                key={item.id}
                href={`/directory/${item.id}`}
                className="card-lift group block rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm hover:border-cares-200"
              >
                <div className="px-4 py-4 sm:px-5 sm:py-5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ServiceTypeIcon serviceType={item.service_type} size="sm" />
                    <span className="text-base sm:text-lg font-bold text-slate-950 leading-snug group-hover:text-cares-800">
                      {item.facility_name}
                    </span>
                    {item.is_owner_verified && (
                      <span className="shrink-0 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        公式
                      </span>
                    )}
                    {!item.is_owner_verified && (
                      <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                        公表DB
                      </span>
                    )}
                    {item.service_type && (
                      <span className="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-cares-50 text-cares-700">
                        {item.service_type}
                      </span>
                    )}
                    {item.acceptance_status && vacancyStatusMap[item.acceptance_status] && (
                      <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${vacancyStatusMap[item.acceptance_status].color}`}>
                        {vacancyStatusMap[item.acceptance_status].label}
                      </span>
                    )}
                  </div>
                  {item.address && (
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">{item.address}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {typeof item.distance_km === 'number' && Number.isFinite(item.distance_km) && (
                      <span className="inline-flex items-center rounded-full bg-cares-50 px-2.5 py-1 text-xs font-bold text-cares-700">
                        現在地から約{item.distance_km < 1 ? `${Math.round(item.distance_km * 1000)}m` : `${item.distance_km.toFixed(1)}km`}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {item.rating_average ? item.rating_average.toFixed(1) : '-'}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {item.rating_count > 0 ? `${item.rating_count}件の評価` : '評価なし'}
                    </span>
                  </div>
                  <div className="mt-2">
                    <CompletenessBar score={item.completeness_score} tier={item.completeness_tier} size="sm" />
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Empty state */}
          {facilities.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-600 mb-2">施設が見つかりません</p>
              <p className="text-base text-gray-400 mb-6">
                条件を変更して再度お試しください
              </p>
              <a
                href="/"
                className="inline-flex items-center px-5 py-2.5 bg-cares-600 text-white rounded-lg text-base font-medium hover:bg-cares-700 transition-colors"
              >
                すべての施設を見る
              </a>
            </div>
          )}

          {/* Pagination */}
          {facilities.length > 0 && (
            <div className="py-8 space-y-4">
              <div className="text-center text-sm text-gray-400">
                {totalCount.toLocaleString()}件中 {((currentPage - 1) * FACILITIES_PER_PAGE + 1).toLocaleString()}〜{Math.min(currentPage * FACILITIES_PER_PAGE, totalCount).toLocaleString()}件を表示
              </div>
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                  {currentPage > 1 && (
                    <a
                      href={buildPageUrl(params, currentPage - 1)}
                      className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      前へ
                    </a>
                  )}
                  {(() => {
                    const pages: (number | '...')[] = []
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i)
                    } else {
                      pages.push(1)
                      if (currentPage > 3) pages.push('...')
                      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                        pages.push(i)
                      }
                      if (currentPage < totalPages - 2) pages.push('...')
                      pages.push(totalPages)
                    }
                    return pages.map((p, idx) =>
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 py-2 text-sm text-gray-400">...</span>
                      ) : (
                        <a
                          key={p}
                          href={buildPageUrl(params, p)}
                          className={`inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 text-sm font-medium rounded-lg transition-colors ${
                            p === currentPage
                              ? 'bg-cares-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {p}
                        </a>
                      )
                    )
                  })()}
                  {currentPage < totalPages && (
                    <a
                      href={buildPageUrl(params, currentPage + 1)}
                      className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      次へ
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </>
        )}
      </div>
    </div>
  )
}
