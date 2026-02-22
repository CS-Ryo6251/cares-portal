import { getSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'
import { Search, MapPin, Building2, Clock, ChevronRight } from 'lucide-react'

type Facility = {
  id: string
  facility_id: string
  overview: string
  features: string[]
  photos: string[]
  acceptance_status: string
  updated_at: string
  facilities: {
    id: string
    name: string
    address: string
    facility_type: string
  }
}

const acceptanceLabels: Record<string, string> = {
  accepting: '受入可能',
  limited: '条件付き受入可',
  waitlist: '待機あり',
  not_accepting: '受入停止中',
  unknown: '要問合せ',
}

const acceptanceColors: Record<string, string> = {
  accepting: 'bg-green-100 text-green-700',
  limited: 'bg-yellow-100 text-yellow-700',
  waitlist: 'bg-orange-100 text-orange-700',
  not_accepting: 'bg-red-100 text-red-700',
  unknown: 'bg-gray-100 text-gray-600',
}

const facilityTypeLabels: Record<string, string> = {
  居宅介護支援事業所: '居宅介護支援',
  通所介護: 'デイサービス',
  訪問介護: '訪問介護',
  特別養護老人ホーム: '特養',
  介護老人保健施設: '老健',
  グループホーム: 'グループホーム',
  有料老人ホーム: '有料老人ホーム',
  サービス付き高齢者向け住宅: 'サ高住',
  小規模多機能型居宅介護: '小規模多機能',
}

async function getFacilities(searchParams: { [key: string]: string | undefined }) {
  const supabase = getSupabaseClient()

  let query = supabase
    .from('facility_portal_profiles')
    .select(`
      id,
      facility_id,
      overview,
      features,
      photos,
      acceptance_status,
      updated_at,
      facilities!inner(
        id,
        name,
        address,
        facility_type
      )
    `)
    .eq('is_published', true)
    .order('updated_at', { ascending: false })

  if (searchParams.area) {
    query = query.ilike('facilities.address', `%${searchParams.area}%`)
  }

  if (searchParams.type) {
    query = query.eq('facilities.facility_type', searchParams.type)
  }

  if (searchParams.status) {
    query = query.eq('acceptance_status', searchParams.status)
  }

  const { data, error } = await query

  if (error) {
    console.error('施設取得エラー:', error)
    return []
  }

  let facilities = (data || []) as unknown as Facility[]

  // フリーワード検索（クライアント側フィルタ）
  if (searchParams.q) {
    const q = searchParams.q.toLowerCase()
    facilities = facilities.filter(
      (f) =>
        f.facilities.name.toLowerCase().includes(q) ||
        f.overview?.toLowerCase().includes(q) ||
        f.facilities.address?.toLowerCase().includes(q)
    )
  }

  return facilities
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  const facilities = await getFacilities(params)

  return (
    <div>
      {/* ヒーローセクション */}
      <section className="bg-gradient-to-b from-cares-50 to-white py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            介護施設のリアルタイム情報
          </h1>
          <p className="text-gray-600 mb-8">
            空き状況・料金・施設の雰囲気がわかる。介護施設を探すならCares。
          </p>

          {/* 検索バー */}
          <form method="GET" action="/" className="max-w-2xl mx-auto">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="q"
                  defaultValue={params.q || ''}
                  placeholder="施設名・エリア・キーワードで検索"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-cares-600 text-white rounded-lg hover:bg-cares-700 font-medium"
              >
                検索
              </button>
            </div>

            {/* フィルター */}
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              <select
                name="area"
                defaultValue={params.area || ''}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">全エリア</option>
                <option value="東京都">東京都</option>
                <option value="神奈川県">神奈川県</option>
                <option value="千葉県">千葉県</option>
                <option value="埼玉県">埼玉県</option>
                <option value="大阪府">大阪府</option>
                <option value="愛知県">愛知県</option>
                <option value="福岡県">福岡県</option>
              </select>

              <select
                name="type"
                defaultValue={params.type || ''}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">全種別</option>
                <option value="居宅介護支援事業所">居宅介護支援</option>
                <option value="通所介護">デイサービス</option>
                <option value="訪問介護">訪問介護</option>
                <option value="特別養護老人ホーム">特養</option>
                <option value="介護老人保健施設">老健</option>
                <option value="グループホーム">グループホーム</option>
                <option value="有料老人ホーム">有料老人ホーム</option>
                <option value="サービス付き高齢者向け住宅">サ高住</option>
              </select>

              <select
                name="status"
                defaultValue={params.status || ''}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">受入状況</option>
                <option value="accepting">受入可能</option>
                <option value="limited">条件付き</option>
                <option value="waitlist">待機あり</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2 text-sm text-cares-600 hover:text-cares-700 font-medium"
              >
                絞り込む
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* 施設一覧 */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        {facilities.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">条件に合う施設が見つかりませんでした</p>
            <p className="text-sm text-gray-400 mt-1">
              検索条件を変更して再度お試しください
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {facilities.length}件の施設が見つかりました
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {facilities.map((f) => (
                <Link
                  key={f.id}
                  href={`/facility/${f.facility_id}`}
                  className="block bg-white rounded-xl border border-gray-200 hover:border-cares-300 hover:shadow-md transition-all p-5"
                >
                  {/* 写真 */}
                  {f.photos && f.photos.length > 0 && (
                    <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-gray-100">
                      <img
                        src={f.photos[0]}
                        alt={f.facilities.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* 施設名 & 種別 */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-gray-900 line-clamp-1">
                      {f.facilities.name}
                    </h3>
                    <span
                      className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                        acceptanceColors[f.acceptance_status] || acceptanceColors.unknown
                      }`}
                    >
                      {acceptanceLabels[f.acceptance_status] || '要問合せ'}
                    </span>
                  </div>

                  {/* 種別 */}
                  <p className="text-xs text-cares-600 font-medium mb-1">
                    {facilityTypeLabels[f.facilities.facility_type] || f.facilities.facility_type}
                  </p>

                  {/* 住所 */}
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="line-clamp-1">{f.facilities.address}</span>
                  </div>

                  {/* 概要 */}
                  {f.overview && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {f.overview}
                    </p>
                  )}

                  {/* 更新日時 */}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(f.updated_at).toLocaleDateString('ja-JP')} 更新
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 text-cares-600">
                      <span>詳細を見る</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
