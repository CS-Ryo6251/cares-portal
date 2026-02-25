import { Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Search className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ページが見つかりません</h1>
        <p className="text-gray-500 mb-6">
          お探しのページは移動または削除された可能性があります。
        </p>
        <div className="flex gap-3 justify-center">
          <a
            href="/"
            className="px-6 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
          >
            トップへ戻る
          </a>
          <a
            href="/directory"
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            施設を探す
          </a>
        </div>
      </div>
    </div>
  )
}
