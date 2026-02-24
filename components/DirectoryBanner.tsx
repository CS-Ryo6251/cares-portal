'use client'

import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'

const STORAGE_KEY = 'cares-directory-banner-dismissed'

export default function DirectoryBanner() {
  const [dismissed, setDismissed] = useState(true) // default hidden to avoid flash

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (!stored) setDismissed(false)
  }, [])

  if (dismissed) return null

  function handleDismiss() {
    sessionStorage.setItem(STORAGE_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="relative bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        aria-label="閉じる"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="shrink-0 w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center mt-0.5">
          <Search className="w-4.5 h-4.5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-0.5">事業所を探していますか？</p>
          <p className="text-sm text-gray-600 mb-2">全国18万件の事業所データベースから検索できます</p>
          <a
            href="/directory"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            施設を探す
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </div>
  )
}
