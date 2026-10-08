'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { Heart, Star, FileText, Bookmark } from 'lucide-react'
import FavoritesTab from './FavoritesTab'
import PersonalListsTab from './PersonalListsTab'
import RatingsTab from './RatingsTab'
import NotesTab from './NotesTab'
import SupportTab from './SupportTab'
import BrochureCollection from '@/components/BrochureCollection'

const TABS = [
  { key: 'support', label: '応援の記録', icon: Heart },
  { key: 'lists', label: 'マイリスト', icon: Bookmark },
  { key: 'brochures', label: '資料', icon: FileText },
  { key: 'favorites', label: 'お気に入り', icon: Bookmark },
  { key: 'ratings', label: '以前のマイ評価', icon: Star },
  { key: 'notes', label: 'マイメモ', icon: FileText },
] as const

type TabKey = (typeof TABS)[number]['key']

function MyActionsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const requested = searchParams.get('tab')
  const currentTab: TabKey = TABS.some(tab => tab.key === requested) ? requested as TabKey : 'support'

  function handleTabChange(tab: TabKey) {
    if (tab === currentTab) return
    if (!window.dispatchEvent(new Event('cares:my-actions-navigate', { cancelable: true }))) return
    router.push(`/my-actions?tab=${tab}`, { scroll: false })
  }

  return (
    <div className="max-w-5xl mx-auto px-3 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-extrabold text-slate-900">Myアクション</h1>
      <p className="mt-2 mb-5 text-sm text-slate-500">応援も、気になる事業所も。あなたのつながりをひとつに。</p>
      {/* Tab bar */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            aria-pressed={currentTab === key}
            onClick={() => handleTabChange(key)}
            className={`inline-flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              currentTab === key
                ? 'bg-gray-800 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {currentTab === 'lists' && <PersonalListsTab />}
      {currentTab === 'support' && <SupportTab />}
      {currentTab === 'brochures' && <BrochureCollection mine />}
      {currentTab === 'favorites' && <FavoritesTab />}
      {currentTab === 'ratings' && <RatingsTab />}
      {currentTab === 'notes' && <NotesTab />}
    </div>
  )
}

export default function MyActionsClient() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex gap-2 mb-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 w-28 bg-gray-200 rounded-full animate-pulse" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-full mb-2" />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <MyActionsContent />
    </Suspense>
  )
}
