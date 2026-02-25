'use client'

import { useState, useEffect } from 'react'
import { FileText, Search, MapPin, Pencil } from 'lucide-react'
import Link from 'next/link'
import PersonalNoteModal from '@/components/PersonalNoteModal'
import { facilityTypeLabels, reporterTypeLabels } from '@/lib/constants'

type ListingInfo = {
  id: string
  facility_name: string
  service_type: string | null
  address: string | null
  acceptance_status: string | null
}

type PersonalNote = {
  listing_id: string
  content: string
  updated_at: string
  cares_listings: ListingInfo
}

type ProfessionalNote = {
  id: string
  listing_id: string
  reporter_type: string
  content: string
  created_at: string
  cares_listings: ListingInfo
}

type MergedFacility = {
  listing_id: string
  listing: ListingInfo
  personalNote: { content: string; updated_at: string } | null
  professionalNotes: { id: string; reporter_type: string; content: string; created_at: string }[]
  latestUpdate: string
}

export default function NotesTab() {
  const [merged, setMerged] = useState<MergedFacility[]>([])
  const [loading, setLoading] = useState(true)
  const [editingNote, setEditingNote] = useState<{ listingId: string; content: string } | null>(null)

  useEffect(() => {
    fetchNotes()
  }, [])

  async function fetchNotes() {
    try {
      const res = await fetch('/api/my-actions/notes')
      if (!res.ok) return

      const data = await res.json()
      const personalNotes: PersonalNote[] = data.personal_notes || []
      const professionalNotes: ProfessionalNote[] = data.professional_notes || []

      // listing_idでマージ
      const map = new Map<string, MergedFacility>()

      for (const pn of personalNotes) {
        if (!pn.cares_listings) continue
        map.set(pn.listing_id, {
          listing_id: pn.listing_id,
          listing: pn.cares_listings,
          personalNote: { content: pn.content, updated_at: pn.updated_at },
          professionalNotes: [],
          latestUpdate: pn.updated_at,
        })
      }

      for (const pn of professionalNotes) {
        if (!pn.cares_listings) continue
        const existing = map.get(pn.listing_id)
        if (existing) {
          existing.professionalNotes.push({
            id: pn.id,
            reporter_type: pn.reporter_type,
            content: pn.content,
            created_at: pn.created_at,
          })
          if (pn.created_at > existing.latestUpdate) {
            existing.latestUpdate = pn.created_at
          }
        } else {
          map.set(pn.listing_id, {
            listing_id: pn.listing_id,
            listing: pn.cares_listings,
            personalNote: null,
            professionalNotes: [{
              id: pn.id,
              reporter_type: pn.reporter_type,
              content: pn.content,
              created_at: pn.created_at,
            }],
            latestUpdate: pn.created_at,
          })
        }
      }

      // 最新更新順
      const sorted = Array.from(map.values()).sort(
        (a, b) => new Date(b.latestUpdate).getTime() - new Date(a.latestUpdate).getTime()
      )

      setMerged(sorted)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  function handleNoteSubmitted() {
    fetchNotes()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-2/3 mb-4" />
            <div className="h-16 bg-gray-100 rounded w-full mb-2" />
          </div>
        ))}
      </div>
    )
  }

  if (merged.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <FileText className="w-10 h-10 text-gray-300" />
        </div>
        <p className="text-lg font-medium text-gray-600 mb-2">
          まだメモがありません
        </p>
        <p className="text-base text-gray-400 mb-6">
          施設にメモを残すと、ここで一覧できます
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <Search className="w-4 h-4" />
          施設を探す
        </a>
      </div>
    )
  }

  return (
    <>
      <p className="text-sm text-gray-500 mb-4">{merged.length}件の施設</p>

      <div className="space-y-4">
        {merged.map((facility) => {
          const listing = facility.listing
          const typeLabel = listing.service_type
            ? facilityTypeLabels[listing.service_type] || listing.service_type
            : null

          return (
            <div
              key={facility.listing_id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Facility header */}
              <div className="px-4 py-4 sm:px-5">
                <Link
                  href={`/directory/${listing.id}`}
                  className="text-base font-bold text-gray-900 leading-snug hover:text-cares-600 transition-colors"
                >
                  {listing.facility_name}
                </Link>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {typeLabel && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-cares-50 text-cares-700">
                      {typeLabel}
                    </span>
                  )}
                  {listing.address && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[200px]">{listing.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes section */}
              <div className="border-t border-gray-50 px-4 py-3 sm:px-5 space-y-3">
                {/* Personal note */}
                {facility.personalNote && (
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-500">個人メモ</span>
                      <button
                        onClick={() =>
                          setEditingNote({
                            listingId: facility.listing_id,
                            content: facility.personalNote!.content,
                          })
                        }
                        className="inline-flex items-center gap-1 text-xs text-cares-600 hover:text-cares-700 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        編集
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {facility.personalNote.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {new Date(facility.personalNote.updated_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                )}

                {/* Professional notes */}
                {facility.professionalNotes.map((pn) => (
                  <div key={pn.id} className="bg-blue-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-blue-600">専門職メモ</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                        {reporterTypeLabels[pn.reporter_type] || pn.reporter_type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{pn.content}</p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {new Date(pn.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                ))}

                {/* Add personal note if none exists */}
                {!facility.personalNote && (
                  <button
                    onClick={() =>
                      setEditingNote({ listingId: facility.listing_id, content: '' })
                    }
                    className="w-full text-left px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  >
                    + 個人メモを追加
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Personal note modal */}
      {editingNote && (
        <PersonalNoteModal
          listingId={editingNote.listingId}
          initialContent={editingNote.content}
          onClose={() => setEditingNote(null)}
          onSubmitted={handleNoteSubmitted}
        />
      )}
    </>
  )
}
