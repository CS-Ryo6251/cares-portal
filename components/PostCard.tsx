'use client'

import { useState } from 'react'
import CommentSection from './CommentSection'
import ServiceTypeIcon from './ServiceTypeIcon'
import { facilityTypeLabels, vacancyStatusMap, postCategoryLabels, formatRelativeDate } from '@/lib/constants'

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

export default function PostCard({ post, facility, acceptanceStatus }: PostCardProps) {
  const [commentOpen, setCommentOpen] = useState(false)

  const category = post.category ? postCategoryLabels[post.category] : null
  const typeLabel = facilityTypeLabels[facility.facility_type] || facility.facility_type
  const status = vacancyStatusMap[acceptanceStatus] || vacancyStatusMap.unknown
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
          className="inline-flex items-center gap-1.5 px-3 py-3 text-gray-500 hover:text-cares-600 text-sm font-medium transition-colors"
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
