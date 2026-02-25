export default function DirectoryDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero skeleton */}
      <div className="h-48 bg-gray-100 rounded-2xl animate-pulse mb-6" />

      {/* Title skeleton */}
      <div className="space-y-3 mb-8">
        <div className="h-7 bg-gray-100 rounded-lg animate-pulse w-2/3" />
        <div className="h-5 bg-gray-100 rounded-lg animate-pulse w-1/2" />
      </div>

      {/* Info cards skeleton */}
      <div className="grid gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="h-5 bg-gray-100 rounded animate-pulse w-1/4 mb-4" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-50 rounded animate-pulse w-full" />
              <div className="h-4 bg-gray-50 rounded animate-pulse w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
