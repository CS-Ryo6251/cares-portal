import { getSupabaseClient } from '@/lib/supabase'
import { simulationTariffs } from '@/lib/simulation-tariffs'
import { profilePhotos, publicWebUrl } from '@/lib/profile-media'
import { facilityManagementUrl } from '@/lib/cares-navigation'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Download, ExternalLink, MapPin, Phone } from 'lucide-react'
import FacilityProfileHeader from '@/components/FacilityProfileHeader'
import FacilityProfileTabs from '@/components/FacilityProfileTabs'
import FacilityPostFeed, { FacilityPhotoGallery } from '@/components/FacilityPostFeed'
import FloatingActions from './FloatingActions'

const acceptanceLabels: Record<string, string> = {
  has_vacancy: '空きあり',
  no_vacancy: '空きなし',
  accepting: '受入可能',
  limited: '条件付き受入可',
  waitlist: '待機あり',
  not_accepting: '受入停止中',
  unknown: '確認中',
}

const acceptanceColors: Record<string, string> = {
  has_vacancy: 'bg-green-100 text-green-700 border-green-200',
  no_vacancy: 'bg-red-100 text-red-700 border-red-200',
  accepting: 'bg-green-100 text-green-700 border-green-200',
  limited: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  waitlist: 'bg-orange-100 text-orange-700 border-orange-200',
  not_accepting: 'bg-red-100 text-red-700 border-red-200',
  unknown: 'bg-gray-100 text-gray-600 border-gray-200',
}


async function getFacilityDetail(facilityId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(facilityId)) return null
  const supabase = getSupabaseClient()

  // プロフィール取得
  const { data: profile, error: profileError } = await supabase
    .from('facility_portal_profiles')
    .select(`
      *,
      facilities!inner(
        id, name, address, service_type, phone
      )
    `)
    .eq('facility_id', facilityId)
    .eq('is_published', true)
    .single()

  if (profileError || !profile) return null

  // 投稿取得（メディア含む）— 多めに取得してカテゴリ別に分配
  const { data: posts, error: postsError, count: postCount } = await supabase
    .from('facility_portal_posts')
    .select(`
      *,
      facility_portal_post_media (
        id, media_url, media_type, sort_order
      )
    `, { count: 'exact' })
    .eq('facility_id', facilityId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(50)

  // 料金取得
  const { data: fees, error: feesError } = await supabase
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

  const { data: directoryListings } = await supabase.from('cares_listings')
    .select('id,service_type').eq('owner_facility_id', facilityId).eq('is_owner_verified', true).order('id')

  return {
    ...profile,
    directoryListings: directoryListings || [],
    posts: posts || [],
    postCount: postsError ? null : (postCount ?? posts?.length ?? 0),
    postsUnavailable: Boolean(postsError),
    fees: fees || [],
    feesUnavailable: Boolean(feesError),
    documents: documents || [],
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const facility = await getFacilityDetail(id)
  if (!facility) return { title: '施設が見つかりません' }

  const joinedFacility = (facility as any).facilities
  const f = Array.isArray(joinedFacility) ? joinedFacility[0] : joinedFacility
  if (!f) return { title: '施設が見つかりません' }

  const name = f.name || '介護事業所'
  const serviceType = f.service_type || '介護事業所'
  const cityMatch = f.address?.replace(/^.+?[県都府道]/, '').match(/^(.+?[市区町村])/)
  const city = cityMatch ? cityMatch[1] : ''
  const title = `${name}（${serviceType}）${city ? ` | ${city}` : ''}`
  const description = `${city ? `${city}の` : ''}${name}の公式ページ。投稿・空き状況・料金情報をチェック。${f.address || ''}`

  return {
    title,
    description,
    openGraph: {
      title: `${name} — Cares`,
      description,
      url: `https://cares.carespace.jp/facility/${id}`,
      type: 'website',
      ...(publicWebUrl(facility.cover_image_url) ? { images: [{ url: facility.cover_image_url, alt: name }] } : {}),
    },
    alternates: {
      canonical: `https://cares.carespace.jp/facility/${id}`,
    },
  }
}

export default async function FacilityDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { id } = await params
  const sp = await searchParams
  const facility = await getFacilityDetail(id)
  if (!facility) notFound()
  const joined = facility.facilities
  const f = Array.isArray(joined) ? joined[0] : joined
  if (!f) notFound()
  const phone = facility.phone || f.phone
  const photos = profilePhotos(facility.photos, facility.posts)
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: f.name,
    description: facility.overview || f.name,
    address: { '@type': 'PostalAddress', streetAddress: f.address, addressCountry: 'JP' },
    ...(phone ? { telephone: phone } : {}),
    ...(publicWebUrl(facility.cover_image_url) ? { image: facility.cover_image_url } : {}),
  }
  const information = <div className="space-y-5 px-4 sm:px-0">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 className="text-lg font-bold">事業所について</h2>
      <dl className="mt-5 space-y-4 text-sm">
        <div><dt className="text-xs text-slate-400">サービス</dt><dd className="mt-1 font-medium">{f.service_type}</dd></div>
        <div><dt className="text-xs text-slate-400">住所</dt><dd className="mt-1 flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{f.address || '事業所にお問い合わせください'}</dd></div>
        {phone && <div><dt className="text-xs text-slate-400">電話</dt><dd><a href={`tel:${phone}`} className="inline-flex min-h-11 items-center gap-2 font-semibold text-rose-700"><Phone className="h-4 w-4" />{phone}</a></dd></div>}
        {facility.fax && <div><dt className="text-xs text-slate-400">FAX</dt><dd className="mt-1">{facility.fax}</dd></div>}
        {facility.email && <div><dt className="text-xs text-slate-400">メール</dt><dd><a href={`mailto:${facility.email}`} className="inline-flex min-h-11 break-all items-center text-rose-700">{facility.email}</a></dd></div>}
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">{[['Webサイト', facility.website], ['Instagram', facility.sns_instagram], ['X', facility.sns_x], ['YouTube', facility.sns_youtube], ['TikTok', facility.sns_tiktok], ['Facebook', facility.sns_facebook]].filter(([, url]) => publicWebUrl(url)).map(([label, url]) => <a key={label} href={publicWebUrl(url)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 px-4 text-xs font-semibold text-slate-700">{label}<ExternalLink className="h-3.5 w-3.5" /></a>)}</div>
      {facility.features?.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{facility.features.map((feature: string) => <span key={feature} className="rounded-full bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">{feature}</span>)}</div>}
    </section>
    {facility.directoryListings.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">空き情報・みんなの声</h2><p className="mt-2 text-sm leading-6 text-slate-500">地域から届いた良いところや、確認日つきの空き情報をご覧いただけます。</p>{facility.directoryListings.map((listing: { id: string; service_type: string | null }) => <Link key={listing.id} href={`/directory/${listing.id}#community`} className="mt-3 block rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{listing.service_type || '事業所'}の空き情報・良いところを見る →</Link>)}</section>}
  </div>
  const fees = <div className="space-y-5 px-4 pb-20 sm:px-0">
    {facility.fee_pattern === 'no_charge' && <p className="rounded-2xl bg-emerald-50 p-6 text-sm text-emerald-900">この事業所は、利用者の費用負担なしとして料金情報を登録しています。詳しくは事業所へお問い合わせください。</p>}
    {!facility.fees.length && !simulationTariffs(f.service_type).length && facility.fee_pattern !== 'no_charge' && <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">料金は事業所にお問い合わせください。</p>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">パンフレット・資料</h2>{facility.documents.length ? <div className="mt-4 space-y-2">{facility.documents.map((document: { id: string; title: string; file_url: string }) => publicWebUrl(document.file_url) && <a key={document.id} href={publicWebUrl(document.file_url)} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"><Download className="h-4 w-4 shrink-0" />{document.title || 'パンフレット'}</a>)}</div> : <p className="mt-3 text-sm text-slate-500">公開中の資料はありません。</p>}</section>
  </div>
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    <div className="mx-auto max-w-4xl pb-16 sm:px-6">
      <Link href="/" className="mx-4 inline-flex min-h-14 items-center gap-2 text-xs font-semibold text-slate-500 sm:mx-0"><ArrowLeft className="h-4 w-4" />事業所を探す</Link>
      <FacilityProfileHeader facilityId={id} name={f.name} serviceType={f.service_type} address={f.address} phone={phone}
        cover={publicWebUrl(facility.cover_image_url)} icon={publicWebUrl(facility.icon_url)} overview={facility.overview}
        statusLabel={acceptanceLabels[facility.acceptance_status] || '確認中'} statusColor={acceptanceColors[facility.acceptance_status] || acceptanceColors.unknown}
        listingIds={facility.directoryListings.map((listing: { id: string }) => listing.id)} postCount={facility.postCount} photoCount={photos.length} />
    <FloatingActions providerSettings={facility.simulation_settings} fees={facility.fees} feePattern={facility.fee_pattern} tariffs={simulationTariffs(f.service_type)} serviceType={f.service_type} facilityName={f.name} address={f.address} feesUnavailable={facility.feesUnavailable} />
      <FacilityProfileTabs
        posts={<FacilityPostFeed posts={facility.posts} facilityId={id} facilityName={f.name} initialCategory={sp.category} unavailable={facility.postsUnavailable} totalCount={facility.postCount ?? undefined} />}
        photos={<FacilityPhotoGallery photos={photos} name={f.name} />}
        information={information} fees={fees} />
      <div className="mx-4 mt-8 border-t border-rose-100 pt-5 text-center sm:mx-0"><p className="text-xs text-slate-500">この事業所の担当者の方へ</p><a href={facilityManagementUrl(id)} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-rose-700 underline underline-offset-4">写真やプロフィールを編集する</a></div>
    </div>
  </>
}
