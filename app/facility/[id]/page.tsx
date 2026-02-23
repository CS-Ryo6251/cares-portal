import { getSupabaseClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { MapPin, Phone, Mail, Globe, FileText, Clock, Download } from 'lucide-react'
import InquiryForm from './InquiryForm'
import FeeSimulator from './FeeSimulator'

const acceptanceLabels: Record<string, string> = {
  accepting: '受入可能',
  limited: '条件付き受入可',
  waitlist: '待機あり',
  not_accepting: '受入停止中',
  unknown: '要問合せ',
}

const acceptanceColors: Record<string, string> = {
  accepting: 'bg-green-100 text-green-700 border-green-200',
  limited: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  waitlist: 'bg-orange-100 text-orange-700 border-orange-200',
  not_accepting: 'bg-red-100 text-red-700 border-red-200',
  unknown: 'bg-gray-100 text-gray-600 border-gray-200',
}

const facilityTypeLabels: Record<string, string> = {
  居宅介護支援事業所: '居宅介護支援事業所',
  通所介護: 'デイサービス',
  訪問介護: '訪問介護',
  特別養護老人ホーム: '特別養護老人ホーム',
  介護老人保健施設: '介護老人保健施設',
  グループホーム: 'グループホーム',
  有料老人ホーム: '有料老人ホーム',
  サービス付き高齢者向け住宅: 'サービス付き高齢者向け住宅',
  小規模多機能型居宅介護: '小規模多機能型居宅介護',
}

async function getFacilityDetail(facilityId: string) {
  const supabase = getSupabaseClient()

  // プロフィール取得
  const { data: profile, error: profileError } = await supabase
    .from('facility_portal_profiles')
    .select(`
      *,
      facilities!inner(
        id, name, address, facility_type, phone
      )
    `)
    .eq('facility_id', facilityId)
    .eq('is_published', true)
    .single()

  if (profileError || !profile) return null

  // 投稿取得（メディア含む）
  const { data: posts } = await supabase
    .from('facility_portal_posts')
    .select(`
      *,
      facility_portal_post_media (
        id, media_url, media_type, sort_order
      )
    `)
    .eq('facility_id', facilityId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(10)

  // 料金取得
  const { data: fees } = await supabase
    .from('facility_portal_fees')
    .select('*')
    .eq('facility_id', facilityId)
    .order('category')
    .order('sort_order')

  // ドキュメント取得
  const { data: documents } = await supabase
    .from('facility_portal_documents')
    .select('*')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false })

  return {
    ...profile,
    posts: posts || [],
    fees: fees || [],
    documents: documents || [],
  }
}

export default async function FacilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const facility = await getFacilityDetail(id)

  if (!facility) {
    notFound()
  }

  const f = facility.facilities as any

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <a href="/" className="hover:text-cares-600">施設一覧</a>
          <span>/</span>
          <span className="text-gray-900">{f.name}</span>
        </div>

        {/* 写真ギャラリー */}
        {facility.photos && facility.photos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6 rounded-xl overflow-hidden">
            {facility.photos.slice(0, 6).map((photo: string, i: number) => (
              <div
                key={i}
                className={`${i === 0 ? 'col-span-2 row-span-2' : ''} aspect-video bg-gray-100`}
              >
                <img
                  src={photo}
                  alt={`${f.name} 写真${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* 施設名・基本情報 */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="text-sm text-cares-600 font-medium mb-1">
              {facilityTypeLabels[f.facility_type] || f.facility_type}
            </p>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{f.name}</h1>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="w-4 h-4" />
              <span>{f.address}</span>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${
              acceptanceColors[facility.acceptance_status] || acceptanceColors.unknown
            }`}
          >
            {acceptanceLabels[facility.acceptance_status] || '要問合せ'}
          </span>
        </div>

        {/* 連絡先 */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
          {(facility.phone || f.phone) && (
            <a href={`tel:${facility.phone || f.phone}`} className="flex items-center gap-1 hover:text-cares-600">
              <Phone className="w-4 h-4" />
              {facility.phone || f.phone}
            </a>
          )}
          {facility.email && (
            <a href={`mailto:${facility.email}`} className="flex items-center gap-1 hover:text-cares-600">
              <Mail className="w-4 h-4" />
              {facility.email}
            </a>
          )}
          {facility.website && (
            <a href={facility.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-cares-600">
              <Globe className="w-4 h-4" />
              Webサイト
            </a>
          )}
        </div>
      </div>

      {/* 概要 */}
      {facility.overview && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b">施設概要</h2>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{facility.overview}</p>
        </section>
      )}

      {/* 特長 */}
      {facility.features && facility.features.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b">特長</h2>
          <div className="flex flex-wrap gap-2">
            {facility.features.map((feature: string, i: number) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-cares-50 text-cares-700 rounded-full text-sm font-medium"
              >
                {feature}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 最新投稿 */}
      {facility.posts.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b">最新情報</h2>
          <div className="space-y-4">
            {facility.posts.map((post: any) => (
              <div key={post.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {new Date(post.created_at).toLocaleDateString('ja-JP', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </span>
                </div>
                {post.title && (
                  <p className="font-bold text-gray-900 mb-1">{post.title}</p>
                )}
                <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
                {/* 複数画像表示 */}
                {post.facility_portal_post_media && post.facility_portal_post_media.length > 0 ? (
                  <div className={`mt-3 grid gap-2 ${post.facility_portal_post_media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {post.facility_portal_post_media
                      .sort((a: any, b: any) => a.sort_order - b.sort_order)
                      .map((media: any) => (
                        <img
                          key={media.id}
                          src={media.media_url}
                          alt=""
                          className="w-full rounded-lg object-cover max-h-64"
                        />
                      ))}
                  </div>
                ) : post.media_url && post.media_type === 'image' ? (
                  <img
                    src={post.media_url}
                    alt=""
                    className="mt-3 rounded-lg max-h-64 object-cover"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 料金シミュレーション */}
      {facility.fees.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b">料金シミュレーション</h2>
          <FeeSimulator fees={facility.fees} />
        </section>
      )}

      {/* パンフレット・資料 */}
      {facility.documents.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b">パンフレット・資料</h2>
          <div className="space-y-2">
            {facility.documents.map((doc: any) => (
              <a
                key={doc.id}
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-cares-300 hover:bg-cares-50 transition-colors"
              >
                <FileText className="w-5 h-5 text-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{doc.title}</p>
                  <p className="text-xs text-gray-500">
                    PDF・{(doc.file_size / 1024 / 1024).toFixed(1)}MB
                  </p>
                </div>
                <Download className="w-4 h-4 text-gray-400 shrink-0" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 問い合わせフォーム */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b">この施設に問い合わせる</h2>
        <InquiryForm facilityId={facility.facility_id} facilityName={f.name} />
      </section>
    </div>
  )
}
