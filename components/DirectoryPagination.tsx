'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

type DirectoryPaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function DirectoryPagination({ page, totalPages, onPageChange }: DirectoryPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-3 py-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
        前へ
      </button>

      <span className="text-sm text-gray-500 tabular-nums">
        {page.toLocaleString()} / {totalPages.toLocaleString()}
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        次へ
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
