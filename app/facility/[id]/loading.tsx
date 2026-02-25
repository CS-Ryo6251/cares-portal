export default function FacilityDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero skeleton */}
      <div className="h-56 bg-gray-100 rounded-2xl animate-pulse mb-6" />

      {/* Title skeleton */}
      <div className="space-y-3 mb-8">
        <div className="h-7 bg-gray-100 rounded-lg animate-pulse w-2/3" />
        <div className="h-5 bg-gray-100 rounded-lg animate-pulse w-1/3" />
      </div>

      {/* Posts skeleton */}
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse" />
              <div className="flex-1">
                <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3 mb-2" />
                <div className="h-3 bg-gray-50 rounded animate-pulse w-1/4" />
              </div>
            </div>
            <div className="h-4 bg-gray-50 rounded animate-pulse w-full mb-2" />
            <div className="h-4 bg-gray-50 rounded animate-pulse w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}
