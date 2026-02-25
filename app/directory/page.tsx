import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Suspense } from 'react'
import DirectorySearch from './DirectorySearch'

export const metadata: Metadata = {
  title: '施設を探す — Cares',
  description: '全国の介護事業所を検索。空き状況やサービス種別で絞り込み、事業所の詳細情報を確認できます。',
}

export default function DirectoryPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-end mb-6">
        <Link
          href="/directory/add"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">事業所を追加</span>
          <span className="sm:hidden">追加</span>
        </Link>
      </div>

      <Suspense fallback={
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="flex gap-2 mb-3">
                <div className="h-5 bg-gray-100 rounded w-20" />
                <div className="h-5 bg-gray-100 rounded w-16" />
              </div>
              <div className="h-4 bg-gray-100 rounded w-full mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      }>
        <DirectorySearch />
      </Suspense>

      {/* Attribution */}
      <div className="text-center py-8 border-t border-gray-100 mt-8">
        <p className="text-xs text-gray-400">
          出典: 介護サービス情報公表システム
        </p>
      </div>
    </div>
  )
}
