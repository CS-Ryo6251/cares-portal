export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">読み込み中...</p>
      </div>
    </div>
  )
}
