'use client'

import { useState } from 'react'
import CommentSection from './CommentSection'
import ServiceTypeIcon from './ServiceTypeIcon'

const categoryLabels: Record<string, { label: string; color: string }> = {
  daily: { label: '日常', color: 'bg-green-100 text-green-700' },
  notice: { label: 'お知らせ', color: 'bg-blue-100 text-blue-700' },
  recruitment: { label: '求人', color: 'bg-purple-100 text-purple-700' },
  event: { label: 'イベント', color: 'bg-orange-100 text-orange-700' },
  volunteer: { label: 'ボランティア', color: 'bg-teal-100 text-teal-700' },
  availability: { label: '空き情報', color: 'bg-emerald-100 text-emerald-700' },
  staff: { label: 'スタッフ紹介', color: 'bg-pink-100 text-pink-700' },
  training: { label: 'イベント', color: 'bg-orange-100 text-orange-700' },
  other: { label: 'その他', color: 'bg-gray-100 text-gray-700' },
}

const facilityTypeLabels: Record<string, string> = {
  訪問介護: '訪問介護',
  訪問入浴介護: '訪問入浴',
  訪問看護: '訪問看護',
  訪問リハビリテーション: '訪問リハ',
  通所介護: 'デイサービス',
  '通所介護（療養通所介護）': '療養通所',
  通所リハビリテーション: '通所リハ',
  短期入所生活介護: 'ショートステイ',
  '短期入所療養介護（介護老人保健施設）': 'SS(老健)',
  '短期入所療養介護（介護療養型医療施設）': 'SS(療養)',
  '短期入所療養介護（介護医療院）': 'SS(医療院)',
  認知症対応型共同生活介護: 'グループホーム',
  '特定施設入居者生活介護（有料老人ホーム）': '有料老人ホーム',
  '特定施設入居者生活介護（軽費老人ホーム）': '軽費老人ホーム',
  '特定施設入居者生活介護（サービス付き高齢者向け住宅）': 'サ高住',
  福祉用具貸与: '福祉用具貸与',
  特定福祉用具販売: '福祉用具販売',
  居宅介護支援: '居宅介護支援',
  介護老人福祉施設: '特養',
  介護老人保健施設: '老健',
  介護療養型医療施設: '介護療養型',
  介護医療院: '介護医療院',
  地域密着型介護老人福祉施設入所者生活介護: '地域密着型特養',
  夜間対応型訪問介護: '夜間訪問介護',
  認知症対応型通所介護: '認知症デイ',
  小規模多機能型居宅介護: '小規模多機能',
  '定期巡回・随時対応型訪問介護看護': '定期巡回',
  看護小規模多機能型居宅介護: '看多機',
  地域密着型通所介護: '地域密着デイ',
  地域包括支援センター: '地域包括',
  居宅介護支援事業所: '居宅介護支援',
  特別養護老人ホーム: '特養',
  グループホーム: 'グループホーム',
  有料老人ホーム: '有料老人ホーム',
  サービス付き高齢者向け住宅: 'サ高住',
}

const acceptanceStatusMap: Record<string, { label: string; color: string }> = {
  has_vacancy: { label: '空きあり', color: 'bg-green-100 text-green-700' },
  no_vacancy: { label: '空きなし', color: 'bg-red-100 text-red-700' },
  unknown: { label: '確認中', color: 'bg-gray-100 text-gray-600' },
  accepting: { label: '空きあり', color: 'bg-green-100 text-green-700' },
  limited: { label: '条件付き', color: 'bg-yellow-100 text-yellow-700' },
  waitlist: { label: '待機あり', color: 'bg-orange-100 text-orange-700' },
  not_accepting: { label: '空きなし', color: 'bg-red-100 text-red-700' },
}

type PostCardProps = {
  post: {
    id: string
    facility_id: string
    title: string | null
    content: string
    category: string | null
    link_url: string | null
    view_count: number
    favorite_count: number
    created_at: string
    facility_portal_post_media: Array<{
      id: string
      media_url: string
      media_type: string
      sort_order: number
    }>
  }
  facility: {
    name: string
    address: string
    facility_type: string
    icon_url?: string | null
  }
  acceptanceStatus: string
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'たった今'
  if (diffMinutes < 60) return `${diffMinutes}分前`
  if (diffHours < 24) return `${diffHours}時間前`
  if (diffDays < 7) return `${diffDays}日前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`

  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function PostCard({ post, facility, acceptanceStatus }: PostCardProps) {
  const [commentOpen, setCommentOpen] = useState(false)

  const category = post.category ? categoryLabels[post.category] : null
  const typeLabel = facilityTypeLabels[facility.facility_type] || facility.facility_type
  const status = acceptanceStatusMap[acceptanceStatus] || acceptanceStatusMap.unknown
  const facilityDetailUrl = `/facility/${post.facility_id}`

  const sortedMedia = post.facility_portal_post_media
    ? [...post.facility_portal_post_media].sort((a, b) => a.sort_order - b.sort_order)
    : []
  const hasImages = sortedMedia.length > 0

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Facility header */}
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {facility.icon_url ? (
            <a href={facilityDetailUrl} className="shrink-0">
              <img
                src={facility.icon_url}
                alt={facility.name}
                className="w-9 h-9 rounded-lg object-cover border border-gray-200"
              />
            </a>
          ) : (
            <a href={facilityDetailUrl} className="shrink-0">
              <ServiceTypeIcon serviceType={facility.facility_type} size="sm" />
            </a>
          )}
          <a
            href={facilityDetailUrl}
            className="text-lg font-bold text-gray-900 hover:text-cares-600 transition-colors leading-snug"
          >
            {facility.name}
          </a>
          <span className="shrink-0 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            公式
          </span>
          <span className="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-cares-50 text-cares-700">
            {typeLabel}
          </span>
          <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>

        {/* Category + date row */}
        <div className="flex items-center gap-2 mt-2">
          {category && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${category.color}`}>
              {category.label}
            </span>
          )}
          <span className="text-sm text-gray-400">
            {formatRelativeDate(post.created_at)}
          </span>
          {post.view_count > 0 && (
            <span className="text-sm text-gray-400 ml-auto">
              👀 {post.view_count.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Photo area */}
      {hasImages && (
        <div className="relative">
          <img
            src={sortedMedia[0].media_url}
            alt={post.title || '投稿画像'}
            className="w-full aspect-[4/3] object-cover"
          />
          {sortedMedia.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {sortedMedia.slice(0, 5).map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i === 0 ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
              {sortedMedia.length > 5 && (
                <span className="text-white text-xs font-medium ml-1">
                  +{sortedMedia.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="px-4 sm:px-5 py-4">
        {post.title && (
          <h3 className="text-lg font-bold text-gray-900 mb-1.5 leading-snug">
            {post.title}
          </h3>
        )}
        <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed line-clamp-4">
          {post.content}
        </p>

        {/* Link URL */}
        {post.link_url && (
          <div className="mt-3">
            <a
              href={post.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors"
            >
              詳細を見る
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="px-4 sm:px-5 pb-3 pt-1 border-t border-gray-50">
        <button
          onClick={() => setCommentOpen(!commentOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 text-gray-500 hover:text-cares-600 text-sm font-medium transition-colors"
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
          {commentOpen && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Inline comment section */}
      {commentOpen && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 border-t border-gray-100 bg-gray-50/50">
          <CommentSection postId={post.id} facilityId={post.facility_id} />
        </div>
      )}
    </article>
  )
}
