import { getSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import PostCard from '@/components/PostCard'

const postCategories = [
  { key: '', label: 'すべて' },
  { key: 'daily', label: '日常' },
  { key: 'notice', label: 'お知らせ' },
  { key: 'event', label: 'イベント' },
  { key: 'availability', label: '空き情報' },
  { key: 'recruitment', label: '求人' },
  { key: 'volunteer', label: 'ボランティア' },
  { key: 'training', label: '研修・セミナー' },
  { key: 'other', label: 'その他' },
]

const acceptanceLabels: Record<string, string> = {
  accepting: '受入可能',
  limited: '条件付き受入可',
  waitlist: '待機あり',
  not_accepting: '受入停止中',
  unknown: '要問合せ',
}

const acceptanceColors: Record<string, string> = {
  accepting: 'bg-green-100 text-green-700',
  limited: 'bg-yellow-100 text-yellow-700',
  waitlist: 'bg-orange-100 text-orange-700',
  not_accepting: 'bg-red-100 text-red-700',
  unknown: 'bg-gray-100 text-gray-600',
}

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
        facilities!inner (
          name, address, facility_type, phone
        )
      )
    `)
    .eq('status', 'published')
    .eq('facility_portal_profiles.is_published', true)
    .order('created_at', { ascending: false })
    .limit(30)

  if (searchParams.category) {
    query = query.eq('category', searchParams.category)
  }

  if (searchParams.area) {
    query = query.ilike('facility_portal_profiles.facilities.address', `%${searchParams.area}%`)
  }

  if (searchParams.status) {
    query = query.eq('facility_portal_profiles.acceptance_status', searchParams.status)
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
        facility_type: facility.facility_type,
        phone: profile.phone || facility.phone,
      },
      acceptanceStatus: profile.acceptance_status,
    }
  })
}

function buildCategoryUrl(currentParams: { [key: string]: string | undefined }, category: string) {
  const params = new URLSearchParams()
  if (currentParams.area) params.set('area', currentParams.area)
  if (currentParams.status) params.set('status', currentParams.status)
  if (currentParams.q) params.set('q', currentParams.q)
  if (category) params.set('category', category)
  const qs = params.toString()
  return qs ? `/?${qs}` : '/'
}

function ActiveFilters({ params }: { params: { [key: string]: string | undefined } }) {
  const filters: { key: string; label: string; value: string }[] = []

  if (params.category) {
    const cat = postCategories.find((c) => c.key === params.category)
    filters.push({ key: 'category', label: 'カテゴリ', value: cat?.label || params.category })
  }
  if (params.area) {
    filters.push({ key: 'area', label: 'エリア', value: params.area })
  }
  if (params.status) {
    const label = acceptanceLabels[params.status] || params.status
    filters.push({ key: 'status', label: '受入状況', value: label })
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
        const qs = newParams.toString()
        const href = qs ? `/?${qs}` : '/'
        return (
          <a
            key={filter.key}
            href={href}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cares-50 text-cares-700 rounded-lg text-sm font-medium hover:bg-cares-100 transition-colors"
          >
            {filter.value}
            <X className="w-3.5 h-3.5" />
          </a>
        )
      })}
      {filters.length > 1 && (
        <a
          href="/"
          className="text-sm text-gray-400 hover:text-gray-600 ml-1"
        >
          すべてクリア
        </a>
      )}
    </div>
  )
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  const currentSort = params.sort || 'recommended'
  const posts = await getFeedPosts(params)

  return (
    <div className="flex gap-0">
      {/* Sidebar - desktop only */}
      <aside className="hidden lg:block w-72 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r border-gray-100 bg-white">
        <Sidebar searchParams={params} />
      </aside>

      {/* Feed */}
      <div className="flex-1 max-w-2xl mx-auto px-4 py-6">
        {/* Mobile search bar */}
        <div className="lg:hidden mb-4">
          <form method="GET" action="/">
            {/* Preserve existing filters */}
            {params.category && <input type="hidden" name="category" value={params.category} />}
            {params.area && <input type="hidden" name="area" value={params.area} />}
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

        {/* Mobile category pills */}
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

        {/* Sort selector */}
        <div className="flex items-center gap-3 mb-4">
          {[
            { key: 'recommended', label: 'おすすめ' },
            { key: 'newest', label: '新着順' },
            { key: 'popular', label: '人気順' },
          ].map((sort) => {
            const isActive = currentSort === sort.key
            const sortParams = new URLSearchParams()
            // 既存パラメータを維持
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
                className={`text-sm font-semibold transition-colors ${
                  isActive ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {sort.label}
              </a>
            )
          })}
        </div>

        {/* Active filters */}
        <ActiveFilters params={params} />

        {/* Post feed */}
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
      </div>
    </div>
  )
}
