import FacilityProfileHeader from '@/components/FacilityProfileHeader'
import ProviderIntakeSection from '@/components/ProviderIntakeSection'
import FacilityPostFeed from '@/components/FacilityPostFeed'
import { profilePhotos, publicWebUrl } from '@/lib/profile-media'
import { simulationTariffs } from '@/lib/simulation-tariffs'
import { getCurrentVacancies } from '@/lib/vacancies'
import { VACANCY_SOURCES } from '@/lib/community'
import { getSupabaseClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRight,
  ArrowLeft,
  MapPin,
  Phone,
  Globe,
  Building2,
  Users,
  Mail,
  Download,
  Shield,
} from 'lucide-react'
import DirectoryDisclaimer from '@/components/DirectoryDisclaimer'
import DirectoryDetailClient from './DirectoryDetailClient'
import EditButton from './EditButton'
import FavoriteButton from '@/components/FavoriteButton'
import FloatingActions from '@/app/facility/[id]/FloatingActions'
import InquiryButton from '@/app/facility/[id]/InquiryButton'
import ShareButtons from '@/app/facility/[id]/ShareButtons'

const acceptanceLabels: Record<string, string> = {
  has_vacancy: '空きあり',
  no_vacancy: '空きなし',
  unknown: '要確認',
  accepting: '空きあり',
  limited: '条件付き',
  waitlist: '待機あり',
  not_accepting: '空きなし',
}

const acceptanceColors: Record<string, string> = {
  has_vacancy: 'bg-green-100 text-green-700',
  no_vacancy: 'bg-red-100 text-red-700',
  unknown: 'bg-gray-100 text-gray-600',
  accepting: 'bg-green-100 text-green-700',
  limited: 'bg-yellow-100 text-yellow-700',
  waitlist: 'bg-orange-100 text-orange-700',
  not_accepting: 'bg-red-100 text-red-700',
}

type PortalData = {
  profile: any
  posts: any[]
  postCount: number | null
  postsUnavailable: boolean
  fees: any[]
  feesUnavailable: boolean
  documents: any[]
} | null

type DirectorySearchParams = {
  post_category?: string
}

async function getListing(id: string) {
  const supabase = getSupabaseClient()

  const { data: facility, error } = await supabase
    .from('cares_listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !facility) return null

  // Recent vacancy reports
  const { data: vacancyReports } = await supabase
    .from('cares_vacancy_reports')
    .select('id,listing_id,vacancy_type,comment,reported_at,is_verified,information_source,confirmed_on,valid_until')
    .eq('listing_id', id)
    .order('reported_at', { ascending: false })
    .limit(10)

  const currentVacancies = await getCurrentVacancies([id])
  const currentReport = currentVacancies?.[id] || null

  let portalData: PortalData = null
  let portalProfileUnavailable = false
  if (facility.is_owner_verified && facility.owner_facility_id) {
    const { data: profile, error: profileError } = await supabase
      .from('facility_portal_profiles')
      .select(`
        *,
        facilities!inner(id, name, address, service_type, phone)
      `)
      .eq('facility_id', facility.owner_facility_id)
      .eq('is_published', true)
      .maybeSingle()
    portalProfileUnavailable = Boolean(profileError)

    if (profile) {
      const { data: posts, error: postsError, count: postCount } = await supabase
        .from('facility_portal_posts')
        .select(`
          *,
          facility_portal_post_media (id, media_url, media_type, sort_order)
        `, { count: 'exact' })
        .eq('facility_id', facility.owner_facility_id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(20)

      const { data: fees, error: feesError } = await supabase
        .from('facility_portal_fees')
        .select('*')
        .eq('facility_id', facility.owner_facility_id)
        .order('category')
        .order('sort_order')

      const { data: documents } = await supabase
        .from('facility_portal_documents')
        .select('*')
        .eq('facility_id', facility.owner_facility_id)
        .order('created_at', { ascending: false })

      portalData = {
        profile,
        posts: posts || [],
        postCount: postsError ? null : (postCount ?? posts?.length ?? 0),
        postsUnavailable: Boolean(postsError),
        fees: fees || [],
        feesUnavailable: Boolean(feesError),
        documents: documents || [],
      }
    }
  }

  return {
    facility,
    vacancyReports: vacancyReports || [],
    currentReport,
    vacancyUnavailable: currentVacancies === null,
    portalData,
    portalProfileUnavailable,
  }
}



export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const data = await getListing(id)
  if (!data) return { title: '事業所が見つかりません — Cares' }

  const f = data.facility
  // Extract city from address for SEO (e.g. "福井県鯖江市..." → "鯖江市")
  const cityMatch = f.address?.replace(/^.+?[県都府道]/, '').match(/^(.+?[市区町村])/)
  const city = cityMatch ? cityMatch[1] : ''
  const areaPrefix = city ? `${city}の` : ''
  const title = `${f.facility_name}（${f.service_type || '介護事業所'}）${city ? ` | ${city}` : ''}`
  const description = `${areaPrefix}${f.facility_name}の空き状況・料金・専門職メモ。${f.service_type || '介護事業所'}。${f.address || ''}`

  return {
    title,
    description,
    openGraph: {
      title: `${f.facility_name} — Cares`,
      description,
      url: `https://cares.carespace.jp/directory/${id}`,
      type: 'website',
    },
    alternates: {
      canonical: `https://cares.carespace.jp/directory/${id}`,
    },
  }
}

export default async function DirectoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<DirectorySearchParams>
}) {
  const { id } = await params
  const sp = await searchParams
  const data = await getListing(id)

  if (!data) {
    notFound()
  }

  const { facility: f, currentReport, vacancyUnavailable, portalData, portalProfileUnavailable } = data
  const isOwnerVerified = f.is_owner_verified
  const officialStatus = isOwnerVerified ? (portalData?.profile?.acceptance_status || f.acceptance_status) : null
  const displayedStatus = officialStatus && officialStatus !== 'unknown' ? officialStatus : currentReport?.vacancy_type || 'unknown'
  const statusLabel = acceptanceLabels[displayedStatus] || '要問合せ'
  const statusColor = acceptanceColors[displayedStatus] || acceptanceColors.unknown

  // Portal-specific data
  const portalProfile = portalData?.profile
  const portalPosts = portalData?.posts || []
  const portalFees = portalData?.fees || []
  const portalDocuments = portalData?.documents || []
  const selectedPostCategory = sp.post_category || ''
  const claimParams = new URLSearchParams({
    source: 'cares',
    listing_id: f.id,
    facility_name: f.facility_name,
  })
  if (f.jigyosho_number) claimParams.set('facility_number', f.jigyosho_number)
  const claimHref = `https://app.carespace.jp/signup/new-organization?${claimParams.toString()}`
  const officialSignals = [
    isOwnerVerified && { label: '事業所公式', tone: 'bg-blue-50 text-blue-700 border-blue-100' },
    portalProfile?.acceptance_status && portalProfile.acceptance_status !== 'unknown' && { label: '空き状況更新あり', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    portalPosts.length > 0 && { label: `写真・投稿 ${portalPosts.length}件`, tone: 'bg-rose-50 text-rose-700 border-rose-100' },
    portalFees.length > 0 && { label: '料金表あり', tone: 'bg-amber-50 text-amber-700 border-amber-100' },
    portalDocuments.length > 0 && { label: 'パンフレットあり', tone: 'bg-violet-50 text-violet-700 border-violet-100' },
  ].filter(Boolean) as Array<{ label: string; tone: string }>

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: f.facility_name,
    description: portalProfile?.overview || `${f.facility_name}（${f.service_type || '介護事業所'}）`,
    address: f.address ? {
      '@type': 'PostalAddress',
      streetAddress: f.address,
      addressRegion: f.prefecture,
      addressCountry: 'JP',
    } : undefined,
    telephone: f.phone || undefined,
    url: f.website_url || portalProfile?.website || undefined,
    additionalType: 'https://schema.org/MedicalBusiness',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-base text-gray-500 hover:text-cares-600 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          戻る
        </Link>

        {isOwnerVerified && portalProfile && <>
          <div className="-mx-4 sm:mx-0">
            <FacilityProfileHeader facilityId={f.owner_facility_id} name={f.facility_name} serviceType={f.service_type} address={f.address}
              cover={publicWebUrl(portalProfile.cover_image_url)} icon={publicWebUrl(portalProfile.icon_url)} overview={portalProfile.overview}
              phone={portalProfile.phone || f.phone} statusLabel={statusLabel} statusColor={statusColor}
              listingIds={[f.id]} postCount={portalData?.postCount ?? null} photoCount={profilePhotos(portalProfile.photos, portalPosts).length} />
          </div>
          <ProviderIntakeSection listingId={f.id} />
          <section className="-mx-4 mt-7 mb-7 sm:mx-0">
            <FacilityPostFeed posts={portalPosts} facilityId={f.owner_facility_id} facilityName={f.facility_name} listingId={f.id}
              initialCategory={selectedPostCategory} unavailable={portalData?.postsUnavailable} totalCount={portalData?.postCount ?? undefined} />
            <Link href={`/facility/${f.owner_facility_id}`} className="mx-4 mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-rose-700 sm:mx-0">写真・プロフィールをもっと見る<ArrowRight className="h-4 w-4" /></Link>
          </section>
        </>}

        {!(isOwnerVerified && portalProfile) && <ProviderIntakeSection listingId={f.id} />}

        <details open={!(isOwnerVerified && portalProfile)} className="mb-6 rounded-2xl border border-gray-100 bg-white">
          <summary className="cursor-pointer px-5 py-4 text-sm font-bold text-slate-700">事業所の基本情報・お問い合わせ先</summary>
          <div className="px-5 pb-3"><DirectoryDisclaimer isOwnerVerified={isOwnerVerified} /></div>
        {/* ===== MAIN INFO CARD ===== */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 mb-6 shadow-sm">
          {/* Name + badges (only show if no hero) */}
          {!(isOwnerVerified && portalProfile) && (
            <>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                    {f.facility_name}
                  </h1>
                  {isOwnerVerified && (
                    <span className="shrink-0 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      公式
                    </span>
                  )}
                </div>
                <span className={`shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold ${statusColor}`}>
                  {statusLabel}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {f.service_type && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-cares-50 text-cares-700">
                    {f.service_type}
                  </span>
                )}
                {f.jigyosho_number && (
                  <span className="text-sm text-gray-500 font-mono">
                    事業所番号: {f.jigyosho_number}
                  </span>
                )}
              </div>
            </>
          )}

          {/* Jigyosho number for hero version */}
          {isOwnerVerified && portalProfile && f.jigyosho_number && (
            <p className="text-sm text-gray-500 font-mono mb-3">
              事業所番号: {f.jigyosho_number}
            </p>
          )}

          {/* Details */}
          <div className={`space-y-2 ${!(isOwnerVerified && portalProfile) ? 'mt-4' : ''}`}>
            {f.address && (
              <div className="flex items-center gap-2 text-base text-gray-600">
                <MapPin className="w-4 h-4 shrink-0 text-gray-400" />
                <span>{f.address}</span>
              </div>
            )}
            {f.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0 text-gray-400" />
                <a href={`tel:${f.phone}`} className="text-base text-gray-600 hover:text-green-700 transition-colors">
                  {f.phone}
                </a>
                {f.fax && <span className="text-sm text-gray-400 ml-2">FAX: {f.fax}</span>}
              </div>
            )}
            {(f.website_url || portalProfile?.website) && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 shrink-0 text-gray-400" />
                <a href={f.website_url || portalProfile?.website} target="_blank" rel="noopener noreferrer"
                  className="text-base text-cares-600 hover:text-cares-700 transition-colors truncate">
                  ウェブサイト
                </a>
              </div>
            )}
            {f.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0 text-gray-400" />
                <a href={`mailto:${f.email}`} className="text-base text-gray-600 hover:text-cares-600 transition-colors">
                  {f.email}
                </a>
              </div>
            )}
            {f.corporation_name && (
              <div className="flex items-center gap-2 text-base text-gray-600">
                <Building2 className="w-4 h-4 shrink-0 text-gray-400" />
                <span>{f.corporation_name}</span>
              </div>
            )}
            {f.capacity > 0 && (
              <div className="flex items-center gap-2 text-base text-gray-600">
                <Users className="w-4 h-4 shrink-0 text-gray-400" />
                <span>定員: {f.capacity}名</span>
              </div>
            )}
          </div>

          {officialSignals.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              {officialSignals.map((signal) => (
                <span key={signal.label} className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${signal.tone}`}>
                  {signal.label}
                </span>
              ))}
            </div>
          )}

          {/* Owner-only: Action buttons + Overview + Features */}
          {isOwnerVerified && portalProfile && (
            <>
              <div className="flex flex-wrap gap-2 mt-4">
                {portalDocuments.length > 0 && (
                  <a href={portalDocuments[0].file_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                    <Download className="w-4 h-4" />
                    事業所公式パンフレット
                  </a>
                )}
                <InquiryButton facilityId={f.owner_facility_id} facilityName={f.facility_name} />
              </div>

              <ShareButtons facilityName={f.facility_name} facilityId={f.owner_facility_id} />

              {portalProfile.overview && (
                <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed mt-4 pt-4 border-t border-gray-100">
                  {portalProfile.overview}
                </p>
              )}

              {portalProfile.features?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {portalProfile.features.map((feature: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 bg-cares-50 text-cares-700 rounded-lg text-sm font-medium">
                      {feature}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Favorite + Edit buttons */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <FavoriteButton listingId={f.id} />
            <EditButton
              listingId={f.id}
              currentValues={{
                facility_name: f.facility_name,
                address: f.address,
                phone: f.phone,
                fax: f.fax,
                email: f.email,
                website_url: f.website_url,
                service_type: f.service_type,
                capacity: f.capacity ? String(f.capacity) : null,
                corporation_name: f.corporation_name,
              }}
            />
          </div>
        </div>

        </details>

        <div className="mb-6"><BrochureCollection key={f.id} listingId={f.id} /></div>

        {!isOwnerVerified && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-cares-200 bg-gradient-to-br from-cares-50 via-white to-rose-50 shadow-sm">
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black tracking-[0.16em] text-cares-600">FOR CARE PROVIDERS</p>
                  <h2 className="mt-2 text-xl font-black leading-tight text-slate-950">
                    この事業所ページを、公式情報で育てませんか。
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    このページは公表データをもとに作成されています。CareSpaceOSに登録すると、空き状況・写真・料金表・パンフレットを事業所公式情報として掲載できます。
                  </p>
                </div>
                <div className="hidden rounded-2xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-cares-100 sm:block">
                  <p className="text-[10px] font-bold text-slate-400">追加できる情報</p>
                  <p className="mt-1 text-2xl font-black text-cares-700">5</p>
                  <p className="text-[10px] font-bold text-slate-400">types</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-xs font-bold text-slate-700 sm:grid-cols-3">
                {['空き状況を最新化', '料金目安を掲載', '写真・パンフレット追加'].map((item) => (
                  <span key={item} className="rounded-xl bg-white px-3 py-2 ring-1 ring-cares-100">{item}</span>
                ))}
              </div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <a href={claimHref} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-cares-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-cares-100 transition hover:bg-cares-700">
                  未登録の事業所を登録する
                  <ArrowRight className="h-4 w-4" />
                </a>
                <Link href="/for-business" className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-bold text-cares-700 ring-1 ring-cares-100 transition hover:bg-cares-50">
                  登録済みの方・掲載管理の案内
                </Link>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-slate-400">
                登録後、事業所番号・法人情報が一致すると、このページと自動でつながります。
              </p>
            </div>
          </div>
        )}

        {/* ===== VACANCY SECTION ===== */}
        <div id="community" className="scroll-mt-24 bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-3">空き状況</h2>

          {currentReport ? <div className="mb-4 rounded-xl bg-emerald-50 p-4">
            <p className="font-bold text-emerald-900">{acceptanceLabels[currentReport.vacancy_type] || '要確認'}</p>
            <p className="mt-2 text-sm text-gray-700">確認日：{currentReport.confirmed_on} ／ 掲載期限：{currentReport.valid_until}</p>
            <p className="mt-1 text-sm text-gray-600">情報源：{VACANCY_SOURCES[currentReport.information_source as keyof typeof VACANCY_SOURCES] || '未確認'}（投稿者申告）</p>
            {currentReport.comment && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{currentReport.comment}</p>}
          </div> : <p className="mb-4 text-sm text-gray-600">{vacancyUnavailable ? '空き情報を取得できませんでした。時間をおいて再読み込みしてください。' : '現在確認できる空き情報はありません。期限切れ・確認日不明の情報は要確認として扱います。'}</p>}

          {/* Client-side interactive parts */}
          <DirectoryDetailClient
            listingId={f.id}
            facilityName={f.facility_name}
            isOwnerVerified={isOwnerVerified}
            jigyoshoNumber={f.jigyosho_number}
            showHearts={!(isOwnerVerified && portalProfile)}
          />

          {/* Vacancy disclaimer */}
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-800 leading-relaxed">
              この情報はコミュニティからの投稿です。正確な空き状況は事業所へ直接お問い合わせください。
            </p>
          </div>
        </div>

        {/* ===== OWNER PORTAL: Official Fee Simulator ===== */}
        {isOwnerVerified && portalProfile?.fee_pattern === 'no_charge' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 mb-6 shadow-sm">
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
              <Shield className="w-10 h-10 text-green-600 mx-auto mb-3" />
              <p className="text-base font-semibold text-green-800">利用者の費用負担はありません</p>
              <p className="text-sm text-green-600 mt-2">全額介護保険で賄われます</p>
            </div>
          </div>
        )}

        {/* ===== OWNER PORTAL: CareSpaceOS official fee simulator ===== */}
        {(simulationTariffs(f.service_type).length > 0 || isOwnerVerified) && (
          <FloatingActions providerSettings={portalProfile?.simulation_settings} fees={portalFees} feePattern={portalProfile?.fee_pattern} tariffs={simulationTariffs(f.service_type)} serviceType={f.service_type} facilityName={f.facility_name} address={`${f.prefecture || ''}${f.address || ''}`} feesUnavailable={portalProfileUnavailable || portalData?.feesUnavailable} />
        )}

        {/* Attribution */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">
            出典: 介護サービス情報公表システム
          </p>
        </div>
      </div>

    </>
  )
}
import BrochureCollection from '@/components/BrochureCollection'
