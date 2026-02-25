'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Banknote, Lock, Star, StickyNote } from 'lucide-react'
import { createAuthClient } from '@/lib/supabase-auth'
import VacancyReportModal from '@/components/VacancyReportModal'
import OwnerClaimModal from '@/components/OwnerClaimModal'
import ProfessionalNoteModal from '@/components/ProfessionalNoteModal'
import PersonalNoteModal from '@/components/PersonalNoteModal'
import FeeInfoModal from '@/components/FeeInfoModal'
import LoginPromptModal from '@/components/LoginPromptModal'

const REPORTER_TYPE_LABELS: Record<string, string> = {
  care_manager: 'ケアマネジャー',
  msw: 'MSW',
  nurse: '看護師',
  therapist: 'リハビリ職',
  counselor: '相談員',
  doctor: '医師',
  other: '専門職',
}

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
}

export default function DirectoryDetailClient({
  listingId,
  facilityName,
  isOwnerVerified,
}: DirectoryDetailClientProps) {
  const [showVacancy, setShowVacancy] = useState(false)
  const [showClaim, setShowClaim] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [showFee, setShowFee] = useState(false)
  const [showPersonalNote, setShowPersonalNote] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
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
  const [activeTab, setActiveTab] = useState<'professional' | 'personal'>('professional')

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
    fetchMyRating()
    fetchPersonalNote()
  }, [fetchNotes, fetchFees, fetchMyRating, fetchPersonalNote])

  const handleRatingClick = async (value: number) => {
    if (!userId) {
      setShowLoginModal(true)
      return
    }
    if (ratingSaving) return
    setRatingSaving(true)
    setMyRating(value)

    try {
      const res = await fetch(`/api/directory/${listingId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: value }),
      })
      if (!res.ok) {
        setMyRating(null)
        fetchMyRating()
      }
    } catch {
      setMyRating(null)
      fetchMyRating()
    } finally {
      setRatingSaving(false)
    }
  }

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

      {/* Personal rating section */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
          <Star className="w-5 h-5 text-gray-400" />
          マイ評価
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
              あなただけに表示されます
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

      {/* Notes section with tabs */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        {/* Tab header */}
        <div className="flex items-center gap-0 mb-4 border-b border-gray-100">
          <button
            onClick={() => setActiveTab('professional')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'professional'
                ? 'border-cares-600 text-cares-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            専門職メモ
            {notes.length > 0 && (
              <span className="text-xs font-normal">({notes.length})</span>
            )}
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
            個人メモ
          </button>
        </div>

        {/* Professional notes tab */}
        {activeTab === 'professional' && (
          <>
            <div className="flex items-center justify-end mb-3">
              <button
                onClick={() => setShowNote(true)}
                className="text-sm text-cares-600 hover:text-cares-700 font-medium"
              >
                + メモを追加
              </button>
            </div>

            {notes.length > 0 ? (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                        {REPORTER_TYPE_LABELS[note.reporter_type] || '専門職'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {getRelativeTime(note.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {note.content}
                    </p>
                  </div>
                ))}
                {notesLimited && notesRemainingCount > 0 && (
                  <div className="relative pt-2">
                    <div className="absolute inset-x-0 -top-8 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                      <Lock className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        残り{notesRemainingCount}件のメモがあります
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        無料登録すると全てのメモを閲覧できます
                      </p>
                      <button
                        onClick={() => setShowLoginModal(true)}
                        className="px-5 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                      >
                        無料登録して続きを読む
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">まだメモがありません</p>
            )}

            <p className="text-xs text-gray-400 mt-3">
              投稿者個人の経験に基づく情報です
            </p>
          </>
        )}

        {/* Personal notes tab */}
        {activeTab === 'personal' && (
          <>
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

      {/* Owner claim CTA (only for non-verified) */}
      {!isOwnerVerified && (
        <div className="mt-6 bg-cares-50 border border-cares-200 rounded-2xl p-5">
          <p className="text-sm font-bold text-cares-800 mb-1">
            この事業所のオーナーですか？
          </p>
          <p className="text-sm text-cares-600 mb-3">
            CareSpace OSに登録して公式情報を管理できます
          </p>
          <button
            onClick={() => setShowClaim(true)}
            className="inline-flex items-center px-4 py-2.5 bg-cares-600 text-white rounded-xl text-sm font-semibold hover:bg-cares-700 transition-colors"
          >
            オーナー登録を申請する
          </button>
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
          onClose={() => setShowClaim(false)}
        />
      )}
      {showNote && (
        <ProfessionalNoteModal
          listingId={listingId}
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
