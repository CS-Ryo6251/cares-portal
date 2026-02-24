'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Banknote } from 'lucide-react'
import VacancyReportModal from '@/components/VacancyReportModal'
import EditProposalModal from '@/components/EditProposalModal'
import OwnerClaimModal from '@/components/OwnerClaimModal'
import ProfessionalNoteModal from '@/components/ProfessionalNoteModal'
import FeeInfoModal from '@/components/FeeInfoModal'

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

type DirectoryDetailClientProps = {
  listingId: string
  facilityName: string
  isOwnerVerified: boolean
  currentValues: Record<string, string | null>
}

export default function DirectoryDetailClient({
  listingId,
  facilityName,
  isOwnerVerified,
  currentValues,
}: DirectoryDetailClientProps) {
  const [showVacancy, setShowVacancy] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showClaim, setShowClaim] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [showFee, setShowFee] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [fees, setFees] = useState<Fee[]>([])

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/directory/${listingId}/notes`)
      if (res.ok) {
        const data = await res.json()
        setNotes(data.notes || [])
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

  useEffect(() => {
    fetchNotes()
    fetchFees()
  }, [fetchNotes, fetchFees])

  return (
    <>
      {/* Vacancy report button */}
      <button
        onClick={() => setShowVacancy(true)}
        className="w-full px-4 py-3 bg-cares-600 text-white rounded-xl text-base font-semibold hover:bg-cares-700 transition-colors"
      >
        空き情報を投稿する
      </button>

      {/* Action buttons */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => setShowEdit(true)}
          className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          情報の修正を提案する
        </button>
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
                    {FEE_TYPE_LABELS[fee.fee_type] || fee.fee_type}
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

      {/* Professional notes section */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-400" />
            専門職メモ
            {notes.length > 0 && (
              <span className="text-sm font-normal text-gray-400">({notes.length}件)</span>
            )}
          </h2>
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
          </div>
        ) : (
          <p className="text-sm text-gray-500">まだメモがありません</p>
        )}

        <p className="text-xs text-gray-400 mt-3">
          投稿者個人の経験に基づく情報です
        </p>
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
      {showEdit && (
        <EditProposalModal
          listingId={listingId}
          currentValues={currentValues}
          onClose={() => setShowEdit(false)}
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
      {showFee && (
        <FeeInfoModal
          listingId={listingId}
          onClose={() => setShowFee(false)}
          onSubmitted={fetchFees}
        />
      )}
    </>
  )
}
