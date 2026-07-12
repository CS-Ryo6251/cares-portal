'use client'

import { useState, useEffect, useCallback } from 'react'
import { BriefcaseBusiness, FileText, Image as ImageIcon, MessageSquare, Banknote, Lock, Star, StickyNote } from 'lucide-react'
import { createAuthClient } from '@/lib/supabase-auth'
import VacancyReportModal from '@/components/VacancyReportModal'
import OwnerClaimModal from '@/components/OwnerClaimModal'
import ProfessionalNoteModal from '@/components/ProfessionalNoteModal'
import PersonalNoteModal from '@/components/PersonalNoteModal'
import FeeInfoModal from '@/components/FeeInfoModal'
import LoginPromptModal from '@/components/LoginPromptModal'

const REPORTER_TYPE_LABELS: Record<string, string> = {
  family: 'ご家族',
  community: '地域の方',
  care_manager: 'ケアマネジャー',
  msw: 'MSW',
  nurse: '看護師',
  therapist: 'リハビリ職',
  counselor: '相談員',
  doctor: '医師',
  other: '専門職',
}

const REVIEW_REPORTER_TYPES = new Set(['family', 'community'])

const FEE_TYPE_LABELS: Record<string, string> = {
  admission: '入居一時金',
  monthly: '月額費用',
  daily: '日額費用',
  insurance_copay: '介護保険自己負担',
  other: 'その他',
}

function getFeeTypeLabel(feeType: string): string {
  return FEE_TYPE_LABELS[feeType] || feeType
}

function formatAmount(min: number | null, max: number | null): string {
  if (min != null && max != null) {
    if (min === max) return `${min.toLocaleString()}円`
    return `${min.toLocaleString()}〜${max.toLocaleString()}円`
  }
  if (min != null) return `${min.toLocaleString()}円〜`
  if (max != null) return `〜${max.toLocaleString()}円`
  return ''
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}日前`
  const months = Math.floor(days / 30)
  return `${months}ヶ月前`
}

type Note = {
  id: string
  reporter_type: string
  content: string
  created_at: string
}

type SharedMedia = {
  id: string
  url: string
  fileName: string
  mimeType: string
}

type SharedCommunityPost = {
  id: string
  kind: 'review' | 'note' | 'photo' | 'brochure'
  content: string
  rating: number | null
  createdAt: string
  media: SharedMedia[]
}

type CommunityEntry = {
  id: string
  label: string
  content: string
  createdAt: string
  rating: number | null
  media: SharedMedia[]
  fromCareSpaceOS: boolean
}

type Fee = {
  id: string
  fee_type: string
  amount_min: number | null
  amount_max: number | null
  description: string | null
  source: string
  created_at: string
}

type PersonalNote = {
  content: string
  updated_at: string
}

type DirectoryDetailClientProps = {
  listingId: string
  facilityName: string
  isOwnerVerified: boolean
  jigyoshoNumber?: string | null
}

export default function DirectoryDetailClient({
  listingId,
  facilityName,
  isOwnerVerified,
  jigyoshoNumber,
}: DirectoryDetailClientProps) {
  const [showVacancy, setShowVacancy] = useState(false)
  const [showClaim, setShowClaim] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [noteMode, setNoteMode] = useState<'review' | 'professional'>('review')
  const [showFee, setShowFee] = useState(false)
  const [showPersonalNote, setShowPersonalNote] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [sharedCommunityPosts, setSharedCommunityPosts] = useState<SharedCommunityPost[]>([])
  const [notesLimited, setNotesLimited] = useState(false)
  const [notesRemainingCount, setNotesRemainingCount] = useState(0)
  const [fees, setFees] = useState<Fee[]>([])
  const [showLoginModal, setShowLoginModal] = useState(false)

  // Auth state
  const [userId, setUserId] = useState<string | null>(null)

  // Personal rating state
  const [myRating, setMyRating] = useState<number | null>(null)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [ratingSaving, setRatingSaving] = useState(false)

  // Personal note state
  const [personalNote, setPersonalNote] = useState<PersonalNote | null>(null)

  // Tab state for notes section
  const [activeTab, setActiveTab] = useState<'reviews' | 'professional' | 'personal'>('reviews')

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createAuthClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    checkAuth()
  }, [])

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/directory/${listingId}/notes`)
      if (res.ok) {
        const data = await res.json()
        setNotes(data.notes || [])
        setNotesLimited(data.limited || false)
        setNotesRemainingCount(data.remaining_count || 0)
      }
    } catch { /* silent */ }
  }, [listingId])

  const fetchFees = useCallback(async () => {
    try {
      const res = await fetch(`/api/directory/${listingId}/fees`)
      if (res.ok) {
        const data = await res.json()
        setFees(data.fees || [])
      }
    } catch { /* silent */ }
  }, [listingId])

  const fetchSharedCommunity = useCallback(async () => {
    try {
      const res = await fetch(`/api/directory/${listingId}/community`)
      if (res.ok) {
        const data = await res.json()
        setSharedCommunityPosts(data.posts || [])
      }
    } catch { /* silent */ }
  }, [listingId])

  const fetchMyRating = useCallback(async () => {
    try {
      const res = await fetch(`/api/directory/${listingId}/rating`)
      if (res.ok) {
        const data = await res.json()
        setMyRating(data.rating ?? null)
      }
    } catch { /* silent */ }
  }, [listingId])

  const fetchPersonalNote = useCallback(async () => {
    try {
      const res = await fetch(`/api/directory/${listingId}/personal-note`)
      if (res.ok) {
        const data = await res.json()
        setPersonalNote(data.note ?? null)
      }
    } catch { /* silent */ }
  }, [listingId])

  useEffect(() => {
    fetchNotes()
    fetchFees()
    fetchSharedCommunity()
    fetchMyRating()
    fetchPersonalNote()
  }, [fetchNotes, fetchFees, fetchSharedCommunity, fetchMyRating, fetchPersonalNote])

  const handleRatingClick = async (value: number) => {
    if (!userId) {
      setShowLoginModal(true)
      return
    }
    if (ratingSaving) return
    setRatingSaving(true)

    const isRemoving = myRating === value
    const prevRating = myRating
    setMyRating(isRemoving ? null : value)

    try {
      const res = isRemoving
        ? await fetch(`/api/directory/${listingId}/rating`, { method: 'DELETE' })
        : await fetch(`/api/directory/${listingId}/rating`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: value }),
          })
      if (!res.ok) {
        setMyRating(prevRating)
      }
    } catch {
      setMyRating(prevRating)
    } finally {
      setRatingSaving(false)
    }
  }

  const reviewEntries: CommunityEntry[] = [
    ...notes
      .filter(note => REVIEW_REPORTER_TYPES.has(note.reporter_type))
      .map(note => ({
        id: `cares-${note.id}`,
        label: REPORTER_TYPE_LABELS[note.reporter_type] || '利用者・ご家族',
        content: note.content,
        createdAt: note.created_at,
        rating: null,
        media: [],
        fromCareSpaceOS: false,
      })),
    ...sharedCommunityPosts
      .filter(post => post.kind === 'review')
      .map(post => ({
        id: `os-${post.id}`,
        label: '匿名のCareSpaceOS利用者',
        content: post.content,
        createdAt: post.createdAt,
        rating: post.rating,
        media: post.media,
        fromCareSpaceOS: true,
      })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const professionalEntries: CommunityEntry[] = [
    ...notes
      .filter(note => !REVIEW_REPORTER_TYPES.has(note.reporter_type))
      .map(note => ({
        id: `cares-${note.id}`,
        label: REPORTER_TYPE_LABELS[note.reporter_type] || '専門職',
        content: note.content,
        createdAt: note.created_at,
        rating: null,
        media: [],
        fromCareSpaceOS: false,
      })),
    ...sharedCommunityPosts
      .filter(post => post.kind === 'note')
      .map(post => ({
        id: `os-${post.id}`,
        label: '匿名のCareSpaceOS専門職',
        content: post.content,
        createdAt: post.createdAt,
        rating: null,
        media: post.media,
        fromCareSpaceOS: true,
      })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const sharedMaterials = sharedCommunityPosts.filter(post => post.kind === 'photo' || post.kind === 'brochure')

  const renderCommunityEntries = (entries: CommunityEntry[], emptyText: string) => entries.length > 0 ? (
    <div className="space-y-4">
      {entries.map(entry => (
        <article key={entry.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${entry.fromCareSpaceOS ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>
              {entry.label}
            </span>
            {entry.fromCareSpaceOS && <span className="text-[10px] font-bold text-gray-400">CareSpaceOSから匿名公開</span>}
            <span className="text-xs text-gray-400">{getRelativeTime(entry.createdAt)}</span>
          </div>
          {entry.rating && (
            <div className="mb-2 flex items-center gap-0.5" aria-label={`5段階中${entry.rating}の評価`}>
              {[1, 2, 3, 4, 5].map(value => (
                <Star key={value} className={`h-4 w-4 ${value <= entry.rating! ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
              ))}
              <span className="ml-1 text-xs font-bold text-amber-700">{entry.rating}/5</span>
            </div>
          )}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{entry.content}</p>
          {entry.media.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {entry.media.map(media => media.mimeType.startsWith('image/') ? (
                <a key={media.id} href={media.url} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={media.url} alt={media.fileName} className="h-28 w-full object-cover" />
                </a>
              ) : (
                <a key={media.id} href={media.url} target="_blank" rel="noopener noreferrer" className="col-span-2 flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                  <FileText className="h-4 w-4" /><span className="truncate">{media.fileName}</span>
                </a>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  ) : <p className="text-sm text-gray-500">{emptyText}</p>

  return (
    <>
      {/* Vacancy report button */}
      <button
        onClick={() => setShowVacancy(true)}
        className="w-full px-4 py-3 bg-cares-600 text-white rounded-xl text-base font-semibold hover:bg-cares-700 transition-colors"
      >
        空き情報を投稿する
      </button>

      {/* Share button */}
      <div className="mt-4">
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: facilityName, url: window.location.href })
            } else {
              navigator.clipboard.writeText(window.location.href)
            }
          }}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          シェア
        </button>
      </div>

      {/* Fee info section */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-gray-400" />
            料金情報
          </h2>
          <button
            onClick={() => setShowFee(true)}
            className="text-sm text-cares-600 hover:text-cares-700 font-medium"
          >
            + 追加する
          </button>
        </div>

        {fees.length > 0 ? (
          <div className="space-y-2">
            {fees.map((fee) => (
              <div key={fee.id} className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {getFeeTypeLabel(fee.fee_type)}
                  </span>
                  {fee.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{fee.description}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {(fee.amount_min != null || fee.amount_max != null) && (
                    <span className="text-sm font-bold text-gray-900">
                      {formatAmount(fee.amount_min, fee.amount_max)}
                    </span>
                  )}
                  <p className="text-xs text-gray-400">
                    {fee.source === 'owner' ? '公式' : 'コミュニティ'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">まだ料金情報がありません</p>
        )}

        <p className="text-xs text-gray-400 mt-3">
          正確な料金は事業所に直接お問い合わせください
        </p>
      </div>

      {/* Public star rating section */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
          <Star className="w-5 h-5 text-gray-400" />
          星評価を投稿
        </h2>
        {userId ? (
          <div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => {
                const active = (hoverRating ?? myRating ?? 0) >= value
                return (
                  <button
                    key={value}
                    onClick={() => handleRatingClick(value)}
                    onMouseEnter={() => setHoverRating(value)}
                    onMouseLeave={() => setHoverRating(null)}
                    disabled={ratingSaving}
                    className="p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        active
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-200'
                      }`}
                    />
                  </button>
                )
              })}
              {myRating && (
                <span className="ml-2 text-sm text-gray-500">{myRating}/5</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              投稿者名と所属事業所は表示されず、平均評価に反映されます
            </p>
          </div>
        ) : (
          <button
            onClick={() => setShowLoginModal(true)}
            className="text-sm text-cares-600 hover:text-cares-700 font-medium"
          >
            ログインして評価する
          </button>
        )}
      </div>

      {sharedMaterials.length > 0 && (
        <section className="mt-6 rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-start gap-2">
            <ImageIcon className="mt-0.5 h-5 w-5 text-rose-500" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">みんなが共有した写真・資料</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-500">CareSpaceOS利用者が、Caresへの匿名公開を選んだ情報です。</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {sharedMaterials.map(post => (
              <article key={post.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-rose-700">{post.kind === 'brochure' ? 'パンフレット' : '写真'}</span>
                  <span className="text-[10px] text-gray-400">{getRelativeTime(post.createdAt)}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">{post.content}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {post.media.map(media => media.mimeType.startsWith('image/') ? (
                    <a key={media.id} href={media.url} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={media.url} alt={media.fileName} className="h-24 w-full object-cover" />
                    </a>
                  ) : (
                    <a key={media.id} href={media.url} target="_blank" rel="noopener noreferrer" className="col-span-2 flex items-center gap-2 rounded-lg border border-rose-100 bg-white px-3 py-2 text-xs font-bold text-rose-700">
                      <FileText className="h-4 w-4" /><span className="truncate">{media.fileName}</span>
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Notes section with tabs */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        {/* Tab header */}
        <div className="mb-4 flex items-center gap-0 overflow-x-auto border-b border-gray-100">
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'reviews'
                ? 'border-cares-600 text-cares-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            口コミ
            {reviewEntries.length > 0 && (
              <span className="text-xs font-normal">({reviewEntries.length})</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('professional')}
            className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'professional'
                ? 'border-cares-600 text-cares-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <BriefcaseBusiness className="w-4 h-4" />
            専門職コメント
            {professionalEntries.length > 0 && <span className="text-xs font-normal">({professionalEntries.length})</span>}
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'personal'
                ? 'border-cares-600 text-cares-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <StickyNote className="w-4 h-4" />
            自分用メモ
          </button>
        </div>

        {/* Reviews from families, users and opted-in CareSpaceOS posts */}
        {activeTab === 'reviews' && (
          <>
            <div className="mb-4 flex flex-col gap-3 rounded-xl bg-rose-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">口コミ</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">利用者・ご家族・地域の方が、見学や利用時の印象を共有する公開情報です。</p>
              </div>
              <button
                onClick={() => { setNoteMode('review'); setShowNote(true) }}
                className="shrink-0 text-sm font-bold text-cares-600 hover:text-cares-700"
              >
                + 口コミを書く
              </button>
            </div>
            {renderCommunityEntries(reviewEntries, 'まだ口コミがありません')}
          </>
        )}

        {/* Comments intended for care professionals */}
        {activeTab === 'professional' && (
          <>
            <div className="mb-4 flex flex-col gap-3 rounded-xl bg-blue-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">専門職コメント</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">ケアマネ・MSW・看護師などが、連携や受け入れ相談に役立つ実務情報を共有します。</p>
              </div>
              <button
                onClick={() => { setNoteMode('professional'); setShowNote(true) }}
                className="shrink-0 text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                + 専門職コメントを共有
              </button>
            </div>
            {renderCommunityEntries(professionalEntries, 'まだ専門職コメントがありません')}
          </>
        )}

        {activeTab !== 'personal' && notesLimited && notesRemainingCount > 0 && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
            <Lock className="mx-auto mb-2 h-5 w-5 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">残り{notesRemainingCount}件の投稿があります</p>
            <button onClick={() => setShowLoginModal(true)} className="mt-3 rounded-lg bg-gray-800 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700">無料登録して続きを読む</button>
          </div>
        )}

        {/* Personal notes tab */}
        {activeTab === 'personal' && (
          <>
            <div className="mb-4 rounded-xl bg-amber-50/70 p-3">
              <p className="text-sm font-bold text-gray-900">自分用メモ</p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-500">検討中のことや確認事項を、自分だけに保存する非公開メモです。事業所や他のユーザーには表示されません。</p>
            </div>
            {userId ? (
              <>
                {personalNote ? (
                  <div>
                    <div className="bg-gray-50 rounded-xl p-4 mb-3">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {personalNote.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        最終更新: {getRelativeTime(personalNote.updated_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowPersonalNote(true)}
                      className="text-sm text-cares-600 hover:text-cares-700 font-medium"
                    >
                      編集する
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <StickyNote className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-3">まだ個人メモがありません</p>
                    <button
                      onClick={() => setShowPersonalNote(true)}
                      className="px-4 py-2 bg-cares-600 text-white rounded-xl text-sm font-medium hover:bg-cares-700 transition-colors"
                    >
                      メモを追加する
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-3">
                  このメモはあなただけに表示されます
                </p>
              </>
            ) : (
              <div className="text-center py-6">
                <Lock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-3">
                  個人メモを使うにはログインが必要です
                </p>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-4 py-2 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  ログインする
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* CareSpaceOS connection */}
      {!isOwnerVerified && (
        <div className="mt-6 rounded-2xl border border-cares-200 bg-gradient-to-br from-cares-50 to-white p-5">
          <p className="text-sm font-bold text-cares-800 mb-1">
            この事業所にお勤めの方へ
          </p>
          <p className="text-sm text-cares-600 mb-3">
            {jigyoshoNumber
              ? 'CareSpaceOSへ登録すると、事業所番号で自動照合され、空き状況や写真を公式情報として更新できます。'
              : '公表DBに未掲載の新設事業所も、CareSpaceOSで登録して公開をONにするとCaresの公式ページを作成できます。'}
          </p>
          <button
            onClick={() => setShowClaim(true)}
            className="inline-flex items-center px-4 py-2.5 bg-cares-600 text-white rounded-xl text-sm font-semibold hover:bg-cares-700 transition-colors"
          >
            私たちの事業所も掲載・更新する
          </button>
        </div>
      )}
      {isOwnerVerified && (
        <div className="mt-6 rounded-2xl border border-cares-200 bg-cares-50 p-5">
          <p className="text-sm font-bold text-cares-800">このページはCareSpaceOSと連携済みです</p>
          <p className="mt-1 text-sm leading-6 text-cares-700">空き状況、写真、料金、パンフレットはCareSpaceOSから更新できます。</p>
          <a href="https://app.carespace.jp/analytics?tab=cares" className="mt-3 inline-flex items-center rounded-xl bg-cares-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cares-700">
            公式情報を更新する
          </a>
        </div>
      )}

      {/* Modals */}
      {showVacancy && (
        <VacancyReportModal
          listingId={listingId}
          onClose={() => setShowVacancy(false)}
        />
      )}
      {showClaim && (
        <OwnerClaimModal
            listingId={listingId}
            facilityName={facilityName}
            jigyoshoNumber={jigyoshoNumber}
            onClose={() => setShowClaim(false)}
          />
      )}
      {showNote && (
        <ProfessionalNoteModal
          listingId={listingId}
          mode={noteMode}
          onClose={() => setShowNote(false)}
          onSubmitted={fetchNotes}
        />
      )}
      {showPersonalNote && (
        <PersonalNoteModal
          listingId={listingId}
          initialContent={personalNote?.content ?? ''}
          onClose={() => setShowPersonalNote(false)}
          onSubmitted={fetchPersonalNote}
        />
      )}
      {showFee && (
        <FeeInfoModal
          listingId={listingId}
          onClose={() => setShowFee(false)}
          onSubmitted={fetchFees}
        />
      )}
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        variant="notes"
      />
    </>
  )
}
