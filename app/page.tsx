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
  // 訪問系
  訪問介護: '訪問介護',
  訪問入浴介護: '訪問入浴介護',
  訪問看護: '訪問看護',
  訪問リハビリテーション: '訪問リハ',
  // 通所系
  通所介護: 'デイサービス',
  '通所介護（療養通所介護）': '療養通所介護',
  通所リハビリテーション: '通所リハ',
  // 短期入所系
  短期入所生活介護: 'ショートステイ',
  '短期入所療養介護（介護老人保健施設）': 'ショートステイ(老健)',
  '短期入所療養介護（介護療養型医療施設）': 'ショートステイ(療養)',
  '短期入所療養介護（介護医療院）': 'ショートステイ(医療院)',
  // 居住系
  認知症対応型共同生活介護: 'グループホーム',
  '特定施設入居者生活介護（有料老人ホーム）': '有料老人ホーム',
  '特定施設入居者生活介護（軽費老人ホーム）': '軽費老人ホーム',
  '特定施設入居者生活介護（サービス付き高齢者向け住宅）': 'サ高住',
  // 福祉用具
  福祉用具貸与: '福祉用具貸与',
  特定福祉用具販売: '福祉用具販売',
  // 居宅介護支援
  居宅介護支援: '居宅介護支援',
  // 施設系
  介護老人福祉施設: '特養',
  介護老人保健施設: '老健',
  介護療養型医療施設: '介護療養型',
  介護医療院: '介護医療院',
  地域密着型介護老人福祉施設入所者生活介護: '地域密着型特養',
  // 地域密着型
  夜間対応型訪問介護: '夜間対応型訪問介護',
  認知症対応型通所介護: '認知症対応型デイ',
  小規模多機能型居宅介護: '小規模多機能',
  '定期巡回・随時対応型訪問介護看護': '定期巡回',
  看護小規模多機能型居宅介護: '看多機',
  地域密着型通所介護: '地域密着型デイ',
  // その他
  地域包括支援センター: '地域包括',
  // 旧データ互換
  居宅介護支援事業所: '居宅介護支援',
  特別養護老人ホーム: '特養',
  グループホーム: 'グループホーム',
  有料老人ホーム: '有料老人ホーム',
  サービス付き高齢者向け住宅: 'サ高住',
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
                <optgroup label="北海道・東北">
                  <option value="北海道">北海道</option>
                  <option value="青森県">青森県</option>
                  <option value="岩手県">岩手県</option>
                  <option value="宮城県">宮城県</option>
                  <option value="秋田県">秋田県</option>
                  <option value="山形県">山形県</option>
                  <option value="福島県">福島県</option>
                </optgroup>
                <optgroup label="関東">
                  <option value="茨城県">茨城県</option>
                  <option value="栃木県">栃木県</option>
                  <option value="群馬県">群馬県</option>
                  <option value="埼玉県">埼玉県</option>
                  <option value="千葉県">千葉県</option>
                  <option value="東京都">東京都</option>
                  <option value="神奈川県">神奈川県</option>
                </optgroup>
                <optgroup label="中部">
                  <option value="新潟県">新潟県</option>
                  <option value="富山県">富山県</option>
                  <option value="石川県">石川県</option>
                  <option value="福井県">福井県</option>
                  <option value="山梨県">山梨県</option>
                  <option value="長野県">長野県</option>
                  <option value="岐阜県">岐阜県</option>
                  <option value="静岡県">静岡県</option>
                  <option value="愛知県">愛知県</option>
                </optgroup>
                <optgroup label="近畿">
                  <option value="三重県">三重県</option>
                  <option value="滋賀県">滋賀県</option>
                  <option value="京都府">京都府</option>
                  <option value="大阪府">大阪府</option>
                  <option value="兵庫県">兵庫県</option>
                  <option value="奈良県">奈良県</option>
                  <option value="和歌山県">和歌山県</option>
                </optgroup>
                <optgroup label="中国">
                  <option value="鳥取県">鳥取県</option>
                  <option value="島根県">島根県</option>
                  <option value="岡山県">岡山県</option>
                  <option value="広島県">広島県</option>
                  <option value="山口県">山口県</option>
                </optgroup>
                <optgroup label="四国">
                  <option value="徳島県">徳島県</option>
                  <option value="香川県">香川県</option>
                  <option value="愛媛県">愛媛県</option>
                  <option value="高知県">高知県</option>
                </optgroup>
                <optgroup label="九州・沖縄">
                  <option value="福岡県">福岡県</option>
                  <option value="佐賀県">佐賀県</option>
                  <option value="長崎県">長崎県</option>
                  <option value="熊本県">熊本県</option>
                  <option value="大分県">大分県</option>
                  <option value="宮崎県">宮崎県</option>
                  <option value="鹿児島県">鹿児島県</option>
                  <option value="沖縄県">沖縄県</option>
                </optgroup>
              </select>

              <select
                name="type"
                defaultValue={params.type || ''}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">全種別</option>
                <optgroup label="訪問系">
                  <option value="訪問介護">訪問介護</option>
                  <option value="訪問入浴介護">訪問入浴介護</option>
                  <option value="訪問看護">訪問看護</option>
                  <option value="訪問リハビリテーション">訪問リハビリテーション</option>
                </optgroup>
                <optgroup label="通所系">
                  <option value="通所介護">通所介護（デイサービス）</option>
                  <option value="通所介護（療養通所介護）">療養通所介護</option>
                  <option value="通所リハビリテーション">通所リハビリテーション</option>
                </optgroup>
                <optgroup label="短期入所系">
                  <option value="短期入所生活介護">短期入所生活介護（ショートステイ）</option>
                  <option value="短期入所療養介護（介護老人保健施設）">短期入所療養介護（老健）</option>
                  <option value="短期入所療養介護（介護療養型医療施設）">短期入所療養介護（療養）</option>
                  <option value="短期入所療養介護（介護医療院）">短期入所療養介護（医療院）</option>
                </optgroup>
                <optgroup label="居住系">
                  <option value="認知症対応型共同生活介護">グループホーム</option>
                  <option value="特定施設入居者生活介護（有料老人ホーム）">有料老人ホーム</option>
                  <option value="特定施設入居者生活介護（軽費老人ホーム）">軽費老人ホーム</option>
                  <option value="特定施設入居者生活介護（サービス付き高齢者向け住宅）">サービス付き高齢者向け住宅</option>
                </optgroup>
                <optgroup label="福祉用具">
                  <option value="福祉用具貸与">福祉用具貸与</option>
                  <option value="特定福祉用具販売">特定福祉用具販売</option>
                </optgroup>
                <optgroup label="居宅介護支援">
                  <option value="居宅介護支援">居宅介護支援</option>
                </optgroup>
                <optgroup label="施設系">
                  <option value="介護老人福祉施設">介護老人福祉施設（特養）</option>
                  <option value="介護老人保健施設">介護老人保健施設（老健）</option>
                  <option value="介護療養型医療施設">介護療養型医療施設</option>
                  <option value="介護医療院">介護医療院</option>
                  <option value="地域密着型介護老人福祉施設入所者生活介護">地域密着型特養</option>
                </optgroup>
                <optgroup label="地域密着型">
                  <option value="夜間対応型訪問介護">夜間対応型訪問介護</option>
                  <option value="認知症対応型通所介護">認知症対応型通所介護</option>
                  <option value="小規模多機能型居宅介護">小規模多機能型居宅介護</option>
                  <option value="定期巡回・随時対応型訪問介護看護">定期巡回・随時対応型訪問介護看護</option>
                  <option value="看護小規模多機能型居宅介護">看護小規模多機能型居宅介護</option>
                  <option value="地域密着型通所介護">地域密着型通所介護</option>
                </optgroup>
                <optgroup label="その他">
                  <option value="地域包括支援センター">地域包括支援センター</option>
                </optgroup>
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
