import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin } from 'lucide-react'

export const metadata: Metadata = {
  title: 'エリアから介護事業所を探す',
  description: '都道府県別に介護事業所を検索。全国18万件の介護サービスの空き状況・料金・専門職メモを確認できます。',
  alternates: {
    canonical: 'https://cares.carespace.jp/area',
  },
}

const regions = [
  { name: '北海道・東北', prefectures: ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'] },
  { name: '関東', prefectures: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'] },
  { name: '中部', prefectures: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'] },
  { name: '近畿', prefectures: ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'] },
  { name: '中国', prefectures: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'] },
  { name: '四国', prefectures: ['徳島県', '香川県', '愛媛県', '高知県'] },
  { name: '九州・沖縄', prefectures: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'] },
]

export default function AreaIndexPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-cares-50 rounded-xl flex items-center justify-center">
          <MapPin className="w-5 h-5 text-cares-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">エリアから探す</h1>
          <p className="text-sm text-gray-500">都道府県を選んで介護事業所を検索</p>
        </div>
      </div>

      <div className="space-y-6">
        {regions.map((region) => (
          <div key={region.name} className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">{region.name}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {region.prefectures.map((pref) => (
                <Link
                  key={pref}
                  href={`/area/${encodeURIComponent(pref)}`}
                  className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 rounded-xl hover:bg-cares-50 hover:text-cares-700 transition-colors text-center"
                >
                  {pref}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
