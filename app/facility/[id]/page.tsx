import { getSupabaseClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Download,
  ExternalLink,
  ArrowLeft,
  ImagePlus,
  ChevronRight,
} from 'lucide-react'
import { Shield } from 'lucide-react'
import ViewTracker from '@/components/ViewTracker'
import CommentSection from '@/components/CommentSection'
import FloatingActions from './FloatingActions'
import InquiryButton from './InquiryButton'

const postCategoryLabels: Record<string, { label: string; color: string; icon: string }> = {
  notice: { label: 'お知らせ', color: 'bg-blue-100 text-blue-700', icon: '📢' },
  daily: { label: '日常', color: 'bg-green-100 text-green-700', icon: '🌿' },
  event: { label: 'イベント', color: 'bg-orange-100 text-orange-700', icon: '🎉' },
  availability: { label: '空き情報', color: 'bg-emerald-100 text-emerald-700', icon: '🛏️' },
  recruitment: { label: '求人', color: 'bg-purple-100 text-purple-700', icon: '👥' },
  volunteer: { label: 'ボランティア', color: 'bg-teal-100 text-teal-700', icon: '🤝' },
  training: { label: '研修・セミナー', color: 'bg-indigo-100 text-indigo-700', icon: '📚' },
  other: { label: 'その他', color: 'bg-gray-100 text-gray-700', icon: '📝' },
}

const allCategories = [
  { key: '', label: 'すべて' },
  { key: 'notice', label: 'お知らせ' },
  { key: 'daily', label: '日常' },
  { key: 'event', label: 'イベント' },
  { key: 'availability', label: '空き情報' },
  { key: 'recruitment', label: '求人' },
  { key: 'volunteer', label: 'ボランティア' },
  { key: 'training', label: '研修・セミナー' },
  { key: 'other', label: 'その他' },
]

// Homepage sections order (for "all" view)
const homepageSections = [
  { key: 'notice', maxPosts: 3 },
  { key: 'daily', maxPosts: 4 },
  { key: 'event', maxPosts: 3 },
  { key: 'availability', maxPosts: 2 },
  { key: 'recruitment', maxPosts: 3 },
  { key: 'volunteer', maxPosts: 2 },
  { key: 'training', maxPosts: 2 },
  { key: 'other', maxPosts: 2 },
]

const acceptanceLabels: Record<string, string> = {
  accepting: '受入可能',
  limited: '条件付き受入可',
  waitlist: '待機あり',
  not_accepting: '受入停止中',
  unknown: '要問合せ',
}

const acceptanceColors: Record<string, string> = {
  accepting: 'bg-green-100 text-green-700 border-green-200',
  limited: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  waitlist: 'bg-orange-100 text-orange-700 border-orange-200',
  not_accepting: 'bg-red-100 text-red-700 border-red-200',
  unknown: 'bg-gray-100 text-gray-600 border-gray-200',
}

const facilityTypeLabels: Record<string, string> = {
  訪問介護: '訪問介護',
  訪問入浴介護: '訪問入浴介護',
  訪問看護: '訪問看護',
  訪問リハビリテーション: '訪問リハビリテーション',
  通所介護: 'デイサービス',
  '通所介護（療養通所介護）': '療養通所介護',
  通所リハビリテーション: '通所リハビリテーション',
  短期入所生活介護: 'ショートステイ',
  '短期入所療養介護（介護老人保健施設）': 'ショートステイ（老健）',
  '短期入所療養介護（介護療養型医療施設）': 'ショートステイ（療養）',
  '短期入所療養介護（介護医療院）': 'ショートステイ（医療院）',
  認知症対応型共同生活介護: 'グループホーム',
  '特定施設入居者生活介護（有料老人ホーム）': '有料老人ホーム',
  '特定施設入居者生活介護（軽費老人ホーム）': '軽費老人ホーム',
  '特定施設入居者生活介護（サービス付き高齢者向け住宅）': 'サービス付き高齢者向け住宅',
  福祉用具貸与: '福祉用具貸与',
  特定福祉用具販売: '特定福祉用具販売',
  居宅介護支援: '居宅介護支援事業所',
  介護老人福祉施設: '特別養護老人ホーム',
  介護老人保健施設: '介護老人保健施設',
  介護療養型医療施設: '介護療養型医療施設',
  介護医療院: '介護医療院',
  地域密着型介護老人福祉施設入所者生活介護: '地域密着型特養',
  夜間対応型訪問介護: '夜間対応型訪問介護',
  認知症対応型通所介護: '認知症対応型通所介護',
  小規模多機能型居宅介護: '小規模多機能型居宅介護',
  '定期巡回・随時対応型訪問介護看護': '定期巡回・随時対応型訪問介護看護',
  看護小規模多機能型居宅介護: '看護小規模多機能型居宅介護',
  地域密着型通所介護: '地域密着型通所介護',
  地域包括支援センター: '地域包括支援センター',
  // 旧データ互換
  居宅介護支援事業所: '居宅介護支援事業所',
  特別養護老人ホーム: '特別養護老人ホーム',
  グループホーム: 'グループホーム',
  有料老人ホーム: '有料老人ホーム',
  サービス付き高齢者向け住宅: 'サービス付き高齢者向け住宅',
}

async function getFacilityDetail(facilityId: string) {
  const supabase = getSupabaseClient()

  // プロフィール取得
  const { data: profile, error: profileError } = await supabase
    .from('facility_portal_profiles')
    .select(`
      *,
      facilities!inner(
        id, name, address, service_type, phone
      )
    `)
    .eq('facility_id', facilityId)
    .eq('is_published', true)
    .single()

  if (profileError || !profile) return null

  // 投稿取得（メディア含む）— 多めに取得してカテゴリ別に分配
  const { data: posts } = await supabase
    .from('facility_portal_posts')
    .select(`
      *,
      facility_portal_post_media (
        id, media_url, media_type, sort_order
      )
    `)
    .eq('facility_id', facilityId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(50)

  // 料金取得
  const { data: fees } = await supabase
    .from('facility_portal_fees')
    .select('*')
    .eq('facility_id', facilityId)
    .order('category')
    .order('sort_order')

  // ドキュメント取得
  const { data: documents } = await supabase
    .from('facility_portal_documents')
    .select('*')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false })

  return {
    ...profile,
    posts: posts || [],
    fees: fees || [],
    documents: documents || [],
  }
}

// Post card component for reuse
function PostCard({ post, facilityId, id, compact }: { post: any; facilityId: string; id: string; compact?: boolean }) {
  const catInfo = post.category && postCategoryLabels[post.category]

  return (
    <div
      id={`post-${post.id}`}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
    >
      <ViewTracker postId={post.id} />
      <div className={compact ? 'p-4' : 'p-6'}>
        {/* Category and date */}
        <div className="flex items-center gap-2 mb-3">
          {catInfo && (
            <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${catInfo.color}`}>
              {catInfo.label}
            </span>
          )}
          <span className="text-sm text-gray-400">
            {new Date(post.created_at).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          {post.view_count > 0 && (
            <span className="text-sm text-gray-400 ml-auto">
              {post.view_count.toLocaleString()} views
            </span>
          )}
        </div>

        {/* Media */}
        {post.facility_portal_post_media &&
        post.facility_portal_post_media.length > 0 ? (
          <div
            className={`mb-4 grid gap-2 rounded-xl overflow-hidden ${
              post.facility_portal_post_media.length === 1
                ? 'grid-cols-1'
                : 'grid-cols-2'
            }`}
          >
            {post.facility_portal_post_media
              .sort((a: any, b: any) => a.sort_order - b.sort_order)
              .slice(0, compact ? 1 : undefined)
              .map((media: any) => (
                <img
                  key={media.id}
                  src={media.media_url}
                  alt=""
                  className={`w-full rounded-xl object-cover ${compact ? 'max-h-48' : 'max-h-80'}`}
                />
              ))}
          </div>
        ) : post.media_url && post.media_type === 'image' ? (
          <img
            src={post.media_url}
            alt=""
            className={`mb-4 rounded-xl w-full object-cover ${compact ? 'max-h-48' : 'max-h-80'}`}
          />
        ) : null}

        {/* Title */}
        {post.title && (
          <h3 className={`font-bold text-gray-900 mb-2 leading-snug ${compact ? 'text-base' : 'text-xl'}`}>
            {post.title}
          </h3>
        )}

        {/* Content */}
        <p className={`text-gray-700 whitespace-pre-wrap leading-relaxed ${compact ? 'text-sm line-clamp-3' : 'text-base'}`}>
          {post.content}
        </p>

        {/* Link */}
        {post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-base text-cares-600 hover:text-cares-700 mt-3 font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            詳細を見る
          </a>
        )}

        {/* Action buttons */}
        {!compact && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
            <a
              href={`#comments-${post.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-base font-medium hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              コメント
            </a>
          </div>
        )}
      </div>

      {/* Comments */}
      {!compact && (
        <div
          id={`comments-${post.id}`}
          className="px-6 pb-6 pt-2 border-t border-gray-100 bg-gray-50/50"
        >
          <CommentSection postId={post.id} facilityId={facilityId} />
        </div>
      )}
    </div>
  )
}

export default async function FacilityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { id } = await params
  const sp = await searchParams
  const facility = await getFacilityDetail(id)

  if (!facility) {
    notFound()
  }

  const f = facility.facilities as any
  const phoneNumber = facility.phone || f.phone
  const activeCategory = sp.category || ''

  // Group posts by category
  const postsByCategory: Record<string, any[]> = {}
  for (const post of facility.posts) {
    const cat = post.category || 'other'
    if (!postsByCategory[cat]) postsByCategory[cat] = []
    postsByCategory[cat].push(post)
  }

  // Filter posts for specific category view
  const filteredPosts = activeCategory
    ? facility.posts.filter((post: any) => post.category === activeCategory)
    : facility.posts

  // Count categories with posts
  const activeCategoryCount = Object.keys(postsByCategory).length
  const totalCategories = Object.keys(postCategoryLabels).length

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-base text-gray-500 hover:text-cares-600 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        フィードに戻る
      </Link>

      {/* Hero / Cover image section */}
      {facility.cover_image_url ? (
        <div className="relative rounded-2xl overflow-hidden mb-6 shadow-sm">
          <img
            src={facility.cover_image_url}
            alt={f.name}
            className="w-full h-48 sm:h-56 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="flex items-end gap-3">
              {facility.icon_url ? (
                <img
                  src={facility.icon_url}
                  alt={f.name}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-lg shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-white/90 backdrop-blur flex items-center justify-center shrink-0 shadow-lg">
                  <span className="text-2xl font-bold text-cares-600">{f.name.charAt(0)}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight drop-shadow-sm truncate">{f.name}</h1>
                <p className="text-sm text-white/80 font-medium mt-0.5">
                  {facilityTypeLabels[f.service_type] || f.service_type}
                </p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-sm ${
                  acceptanceColors[facility.acceptance_status] || acceptanceColors.unknown
                }`}
              >
                {acceptanceLabels[facility.acceptance_status] || '要問合せ'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden mb-6 shadow-sm bg-gradient-to-br from-cares-50 via-cares-100/50 to-blue-50">
          {/* Incentive: カバー写真未設定 */}
          <div className="flex items-center justify-center h-32 sm:h-40">
            <div className="text-center">
              <ImagePlus className="w-8 h-8 text-cares-300 mx-auto mb-2" />
              <p className="text-sm text-cares-400 font-medium">カバー写真を設定すると施設の魅力がもっと伝わります</p>
            </div>
          </div>
          <div className="px-5 pb-5 pt-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                {facility.icon_url ? (
                  <img
                    src={facility.icon_url}
                    alt={f.name}
                    className="w-14 h-14 rounded-xl object-cover border border-gray-200 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white border border-cares-100 flex items-center justify-center shrink-0">
                    <span className="text-xl font-bold text-cares-600">{f.name.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 leading-tight">{f.name}</h1>
                  <p className="text-base text-cares-600 font-medium mt-1">
                    {facilityTypeLabels[f.service_type] || f.service_type}
                  </p>
                </div>
              </div>
              <span
                className={`shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${
                  acceptanceColors[facility.acceptance_status] || acceptanceColors.unknown
                }`}
              >
                {acceptanceLabels[facility.acceptance_status] || '要問合せ'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Info & Actions card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
        {/* Address & Phone */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-base text-gray-600">
            <MapPin className="w-4 h-4 shrink-0 text-gray-400" />
            <span>{f.address}</span>
          </div>
          {phoneNumber && (
            <div className="flex items-center gap-3">
              <a
                href={`tel:${phoneNumber}`}
                className="inline-flex items-center gap-1.5 text-base text-gray-600 hover:text-green-700 transition-colors"
              >
                <Phone className="w-4 h-4 shrink-0 text-gray-400" />
                <span>{phoneNumber}</span>
              </a>
              {facility.email && (
                <a
                  href={`mailto:${facility.email}`}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>メール</span>
                </a>
              )}
            </div>
          )}
          {!phoneNumber && facility.email && (
            <a
              href={`mailto:${facility.email}`}
              className="inline-flex items-center gap-1.5 text-base text-gray-600 hover:text-gray-700 transition-colors"
            >
              <Mail className="w-4 h-4 shrink-0 text-gray-400" />
              <span>{facility.email}</span>
            </a>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          {facility.website && (
            <a
              href={facility.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              <Globe className="w-4 h-4" />
              Webサイト
            </a>
          )}
          {facility.documents.length > 0 && (
            <a
              href={facility.documents[0].file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              パンフレット
            </a>
          )}
          <InquiryButton facilityId={facility.facility_id} facilityName={f.name} />
        </div>

        {/* Overview */}
        {facility.overview && (
          <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed mt-4 pt-4 border-t border-gray-100">
            {facility.overview}
          </p>
        )}

        {/* Features */}
        {facility.features && facility.features.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {facility.features.map((feature: string, i: number) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-cares-50 text-cares-700 rounded-lg text-sm font-medium"
              >
                {feature}
              </span>
            ))}
          </div>
        )}

        {/* Page completeness indicator */}
        {facility.posts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500 font-medium">ページ充実度</span>
                  <span className="text-xs text-cares-600 font-bold">{activeCategoryCount}/{totalCategories} カテゴリ</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-cares-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.round((activeCategoryCount / totalCategories) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category tabs */}
      {facility.posts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {allCategories.map((cat) => {
            const isActive = activeCategory === cat.key
            const count = cat.key ? (postsByCategory[cat.key]?.length || 0) : facility.posts.length
            const href = cat.key
              ? `/facility/${id}?category=${cat.key}`
              : `/facility/${id}`
            return (
              <a
                key={cat.key}
                href={href}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-cares-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-cares-300 hover:text-cares-600'
                }`}
              >
                {cat.label}
                {count > 0 && (
                  <span className={`ml-1.5 text-xs ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                    {count}
                  </span>
                )}
              </a>
            )
          })}
        </div>
      )}

      {/* ===== HOMEPAGE VIEW (no category selected) ===== */}
      {!activeCategory && facility.posts.length > 0 && (
        <div className="space-y-8">
          {homepageSections.map((section) => {
            const posts = postsByCategory[section.key]
            if (!posts || posts.length === 0) return null
            const catInfo = postCategoryLabels[section.key]
            const displayPosts = posts.slice(0, section.maxPosts)
            const hasMore = posts.length > section.maxPosts

            return (
              <div key={section.key}>
                {/* Section header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{catInfo.icon}</span>
                    <h2 className="text-base font-bold text-gray-900">{catInfo.label}</h2>
                    <span className="text-xs text-gray-400 font-medium">{posts.length}件</span>
                  </div>
                  {hasMore && (
                    <a
                      href={`/facility/${id}?category=${section.key}`}
                      className="inline-flex items-center gap-0.5 text-sm text-cares-600 hover:text-cares-700 font-medium"
                    >
                      すべて見る
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Posts */}
                <div className="space-y-4">
                  {displayPosts.map((post: any) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      facilityId={facility.facility_id}
                      id={id}
                      compact={displayPosts.length > 2}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ===== CATEGORY VIEW (specific category selected) ===== */}
      {activeCategory && (
        <div className="space-y-6">
          {filteredPosts.map((post: any) => (
            <PostCard
              key={post.id}
              post={post}
              facilityId={facility.facility_id}
              id={id}
            />
          ))}

          {filteredPosts.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">{postCategoryLabels[activeCategory]?.icon || '📝'}</span>
              </div>
              <p className="text-base text-gray-500 mb-1">
                {postCategoryLabels[activeCategory]?.label || activeCategory}の投稿はまだありません
              </p>
              <p className="text-sm text-gray-400">
                投稿すると、施設ページがもっと充実します
              </p>
            </div>
          )}
        </div>
      )}

      {/* No posts at all */}
      {facility.posts.length === 0 && !activeCategory && (
        <div className="text-center py-12 mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <p className="text-base text-gray-500 mb-1">まだ投稿がありません</p>
          <p className="text-sm text-gray-400">
            お知らせ・日常・イベントなどを投稿して、施設の魅力を伝えましょう
          </p>
        </div>
      )}

      {/* パターンA: 自己負担なしの表示 */}
      {facility.fee_pattern === 'no_charge' && (
        <div className="mb-8 mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gray-200" />
            <h2 className="text-lg font-bold text-gray-900 shrink-0">料金について</h2>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <Shield className="w-10 h-10 text-green-600 mx-auto mb-3" />
            <p className="text-base font-semibold text-green-800">
              利用者の費用負担はありません
            </p>
            <p className="text-sm text-green-600 mt-2">
              全額介護保険で賄われます
            </p>
          </div>
        </div>
      )}

      {/* Floating fee simulator button */}
      <FloatingActions fees={facility.fees} feePattern={facility.fee_pattern} />
    </div>
  )
}
