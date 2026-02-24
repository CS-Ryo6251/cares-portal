import { Search } from 'lucide-react'

type SidebarProps = {
  searchParams: { [key: string]: string | undefined }
}

const categories = [
  { key: '', label: 'すべて', color: 'bg-gray-100 text-gray-700' },
  { key: 'daily', label: '日常', color: 'bg-green-100 text-green-700' },
  { key: 'notice', label: 'お知らせ', color: 'bg-blue-100 text-blue-700' },
  { key: 'recruitment', label: '求人', color: 'bg-purple-100 text-purple-700' },
  { key: 'event', label: 'イベント', color: 'bg-orange-100 text-orange-700' },
  { key: 'volunteer', label: 'ボランティア', color: 'bg-teal-100 text-teal-700' },
  { key: 'availability', label: '空き情報', color: 'bg-emerald-100 text-emerald-700' },
  { key: 'staff', label: 'スタッフ紹介', color: 'bg-pink-100 text-pink-700' },
  { key: 'other', label: 'その他', color: 'bg-gray-100 text-gray-700' },
]

const acceptanceStatuses = [
  { key: 'has_vacancy', label: '空きあり', color: 'bg-green-100 text-green-700' },
  { key: 'no_vacancy', label: '空きなし', color: 'bg-red-100 text-red-700' },
  { key: 'unknown', label: '確認中', color: 'bg-gray-100 text-gray-600' },
]

const prefecturesByRegion = [
  { region: '北海道・東北', prefectures: ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'] },
  { region: '関東', prefectures: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'] },
  { region: '中部', prefectures: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'] },
  { region: '近畿', prefectures: ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'] },
  { region: '中国', prefectures: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'] },
  { region: '四国', prefectures: ['徳島県', '香川県', '愛媛県', '高知県'] },
  { region: '九州・沖縄', prefectures: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'] },
]

function buildHref(
  currentParams: { [key: string]: string | undefined },
  overrideKey: string,
  overrideValue: string
): string {
  const params = new URLSearchParams()
  // Carry over existing params
  for (const [k, v] of Object.entries(currentParams)) {
    if (v && k !== overrideKey) {
      params.set(k, v)
    }
  }
  // Set or remove the override
  if (overrideValue) {
    params.set(overrideKey, overrideValue)
  }
  const qs = params.toString()
  return qs ? `/?${qs}` : '/'
}

export default function Sidebar({ searchParams }: SidebarProps) {
  const currentCategory = searchParams.category || ''
  const currentArea = searchParams.area || ''
  const currentStatus = searchParams.status || ''
  const currentQ = searchParams.q || ''
  const currentView = searchParams.view || 'facilities'

  return (
    <div className="px-4 pt-4 pb-5 space-y-6">
        {/* Search */}
        <div>
          <form method="GET" action="/">
            {/* Preserve existing filters */}
            {currentView === 'posts' && <input type="hidden" name="view" value="posts" />}
            {currentCategory && <input type="hidden" name="category" value={currentCategory} />}
            {currentArea && <input type="hidden" name="area" value={currentArea} />}
            {currentStatus && <input type="hidden" name="status" value={currentStatus} />}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
              <input
                type="text"
                name="q"
                defaultValue={currentQ}
                placeholder="施設名・キーワードで検索"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-medium focus:ring-2 focus:ring-cares-500 focus:border-cares-500 focus:bg-white outline-none transition-colors placeholder:text-gray-400"
              />
            </div>
          </form>
        </div>

        {/* Area filter */}
        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
            エリア
          </h3>
          <form method="GET" action="/">
            {/* Preserve other filters */}
            {currentView === 'posts' && <input type="hidden" name="view" value="posts" />}
            {currentQ && <input type="hidden" name="q" value={currentQ} />}
            {currentCategory && <input type="hidden" name="category" value={currentCategory} />}
            {currentStatus && <input type="hidden" name="status" value={currentStatus} />}
            <div className="flex gap-2">
              <select
                name="area"
                defaultValue={currentArea}
                className="flex-1 min-w-0 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-medium focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none appearance-none cursor-pointer"
              >
                <option value="">全国</option>
                {prefecturesByRegion.map((group) => (
                  <optgroup key={group.region} label={group.region}>
                    {group.prefectures.map((pref) => (
                      <option key={pref} value={pref}>
                        {pref}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button
                type="submit"
                className="shrink-0 px-3 py-2.5 bg-cares-600 text-white rounded-xl text-sm font-medium hover:bg-cares-700 transition-colors"
              >
                絞込
              </button>
            </div>
          </form>
        </div>

        {/* Acceptance status filter */}
        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
            受入状況
          </h3>
          <div className="space-y-1.5">
            {/* "All" option */}
            <a
              href={buildHref(searchParams, 'status', '')}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                !currentStatus
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              すべて
              {!currentStatus && (
                <span className="ml-auto text-cares-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </a>
            {acceptanceStatuses.map((status) => {
              const isActive = currentStatus === status.key
              return (
                <a
                  key={status.key}
                  href={buildHref(searchParams, 'status', status.key)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${status.color.split(' ')[0]}`} />
                  {status.label}
                  {isActive && (
                    <span className="ml-auto text-cares-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </a>
              )
            })}
          </div>
        </div>

        {/* Category filter */}
        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
            投稿カテゴリ
          </h3>
          <div className="space-y-1.5">
            {categories.map((cat) => {
              const isActive = currentCategory === cat.key
              return (
                <a
                  key={cat.key || '__all__'}
                  href={buildHref(searchParams, 'category', cat.key)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${cat.color.split(' ')[0]}`} />
                  {cat.label}
                  {isActive && (
                    <span className="ml-auto text-cares-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </a>
              )
            })}
          </div>
        </div>

        {/* Clear filters */}
        {(currentQ || currentCategory || currentArea || currentStatus) && (
          <div className="pt-2 border-t border-gray-100">
            <a
              href="/"
              className="block text-center px-3 py-2 text-sm text-gray-500 hover:text-cares-600 font-medium transition-colors"
            >
              フィルターをクリア
            </a>
          </div>
        )}
    </div>
  )
}
