'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import LoginPromptModal from './LoginPromptModal'

type NoteGateProps = {
  limited: boolean
  remainingCount: number
  listingId: string
  children: React.ReactNode
}

export default function NoteGate({ limited, remainingCount, listingId, children }: NoteGateProps) {
  const [showLoginModal, setShowLoginModal] = useState(false)

  return (
    <>
      {children}

      {limited && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">
            あと{remainingCount}件のメモを見るにはログインが必要です
          </p>
          <p className="text-xs text-gray-400 mb-4">
            無料登録で全てのメモを閲覧できます
          </p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="inline-flex items-center px-5 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            無料登録して続きを読む
          </button>
        </div>
      )}

      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        variant="notes"
      />
    </>
  )
}
