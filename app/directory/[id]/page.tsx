import { getSupabaseClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowLeft,
  MapPin,
  Phone,
  Globe,
  Building2,
  Users,
  Mail,
  Download,
  ExternalLink,
  Shield,
  Megaphone,
  Leaf,
  PartyPopper,
  BedDouble,
  Smile,
  Handshake,
  FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import DirectoryDisclaimer from '@/components/DirectoryDisclaimer'
import DirectoryDetailClient from './DirectoryDetailClient'
import EditButton from './EditButton'
import ViewTracker from '@/components/ViewTracker'
import CommentSection from '@/components/CommentSection'
import FloatingActions from '@/app/facility/[id]/FloatingActions'
import InquiryButton from '@/app/facility/[id]/InquiryButton'
import ShareButtons from '@/app/facility/[id]/ShareButtons'

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

const postCategoryLabels: Record<string, { label: string; color: string; Icon: LucideIcon; dot: string }> = {
  notice: { label: 'お知らせ', color: 'bg-blue-100 text-blue-700', Icon: Megaphone, dot: 'bg-blue-400' },
  daily: { label: '日常', color: 'bg-green-100 text-green-700', Icon: Leaf, dot: 'bg-green-400' },
  event: { label: 'イベント', color: 'bg-orange-100 text-orange-700', Icon: PartyPopper, dot: 'bg-orange-400' },
  availability: { label: '空き情報', color: 'bg-emerald-100 text-emerald-700', Icon: BedDouble, dot: 'bg-emerald-400' },
  recruitment: { label: '求人', color: 'bg-purple-100 text-purple-700', Icon: Users, dot: 'bg-purple-400' },
  staff: { label: 'スタッフ紹介', color: 'bg-pink-100 text-pink-700', Icon: Smile, dot: 'bg-pink-400' },
  volunteer: { label: 'ボランティア', color: 'bg-teal-100 text-teal-700', Icon: Handshake, dot: 'bg-teal-400' },
  training: { label: 'イベント', color: 'bg-orange-100 text-orange-700', Icon: PartyPopper, dot: 'bg-orange-400' },
  other: { label: 'その他', color: 'bg-gray-100 text-gray-700', Icon: FileText, dot: 'bg-gray-400' },
}

type PortalData = {
  profile: any
  posts: any[]
  fees: any[]
  documents: any[]
} | null

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
    .select('*')
    .eq('listing_id', id)
    .order('reported_at', { ascending: false })
    .limit(10)

  // Vacancy summary (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentReports = (vacancyReports || []).filter(
    (r: any) => new Date(r.reported_at) >= thirtyDaysAgo
  )

  const vacancySummary = {
    has_vacancy: recentReports.filter((r: any) => r.vacancy_type === 'has_vacancy').length,
    no_vacancy: recentReports.filter((r: any) => r.vacancy_type === 'no_vacancy').length,
    unknown: recentReports.filter((r: any) => r.vacancy_type === 'unknown').length,
    latest_report_at: recentReports[0]?.reported_at || null,
  }

  // If owner-verified, fetch portal data
  let portalData: PortalData = null
  if (facility.is_owner_verified && facility.owner_facility_id) {
    const { data: profile } = await supabase
      .from('facility_portal_profiles')
      .select(`
        *,
        facilities!inner(id, name, address, service_type, phone)
      `)
      .eq('facility_id', facility.owner_facility_id)
      .eq('is_published', true)
      .single()

    if (profile) {
      const { data: posts } = await supabase
        .from('facility_portal_posts')
        .select(`
          *,
          facility_portal_post_media (id, media_url, media_type, sort_order)
        `)
        .eq('facility_id', facility.owner_facility_id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(20)

      const { data: fees } = await supabase
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
        fees: fees || [],
        documents: documents || [],
      }
    }
  }

  return {
    facility,
    vacancyReports: vacancyReports || [],
    vacancySummary,
    portalData,
  }
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}日前`
  const months = Math.floor(days / 30)
  return `${months}ヶ月前`
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
  return {
    title: `${f.facility_name} — Cares 介護施設ノート`,
    description: `${f.facility_name}（${f.service_type || '介護事業所'}）の施設情報・空き状況・料金。${f.address || ''}`,
  }
}

// Post card for owner portal posts
function PortalPostCard({ post, facilityId }: { post: any; facilityId: string }) {
  const catInfo = post.category && postCategoryLabels[post.category]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <ViewTracker postId={post.id} />
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {catInfo && (
            <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${catInfo.color}`}>
              {catInfo.label}
            </span>
          )}
          <span className="text-sm text-gray-400">
            {new Date(post.created_at).toLocaleDateString('ja-JP', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </span>
        </div>

        {post.facility_portal_post_media?.length > 0 && (
          <div className={`mb-4 grid gap-2 rounded-xl overflow-hidden ${
            post.facility_portal_post_media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          }`}>
            {post.facility_portal_post_media
              .sort((a: any, b: any) => a.sort_order - b.sort_order)
              .map((media: any) => (
                <img key={media.id} src={media.media_url} alt="" className="w-full rounded-xl object-cover max-h-80" />
              ))}
          </div>
        )}

        {post.title && (
          <h3 className="text-lg font-bold text-gray-900 mb-2 leading-snug">{post.title}</h3>
        )}

        <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed line-clamp-6">
          {post.content}
        </p>

        {post.link_url && (
          <a href={post.link_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-base text-cares-600 hover:text-cares-700 mt-3 font-medium">
            <ExternalLink className="w-4 h-4" />
            詳細を見る
          </a>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100">
          <CommentSection postId={post.id} facilityId={facilityId} />
        </div>
      </div>
    </div>
  )
}

export default async function DirectoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getListing(id)

  if (!data) {
    notFound()
  }

  const { facility: f, vacancySummary, portalData } = data
  const isOwnerVerified = f.is_owner_verified
  const statusLabel = acceptanceLabels[f.acceptance_status || 'unknown'] || '要問合せ'
  const statusColor = acceptanceColors[f.acceptance_status || 'unknown'] || acceptanceColors.unknown
  const hasVacancyData = vacancySummary.has_vacancy > 0 || vacancySummary.no_vacancy > 0

  // Portal-specific data
  const portalProfile = portalData?.profile
  const portalFacility = portalProfile?.facilities as any
  const portalPosts = portalData?.posts || []
  const portalFees = portalData?.fees || []
  const portalDocuments = portalData?.documents || []

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back link */}
        <Link
          href="/directory"
          className="inline-flex items-center gap-1.5 text-base text-gray-500 hover:text-cares-600 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          戻る
        </Link>

        {/* Disclaimer */}
        <div className="mb-4">
          <DirectoryDisclaimer isOwnerVerified={isOwnerVerified} />
        </div>

        {/* ===== HERO: Owner-verified with cover image ===== */}
        {isOwnerVerified && portalProfile?.cover_image_url ? (
          <div className="relative rounded-2xl overflow-hidden mb-6 shadow-sm">
            <img src={portalProfile.cover_image_url} alt={f.facility_name} className="w-full h-48 sm:h-56 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
              <div className="flex items-end gap-3 flex-wrap">
                {portalProfile.icon_url ? (
                  <img src={portalProfile.icon_url} alt={f.facility_name}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover border-2 border-white shadow-lg shrink-0" />
                ) : (
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-white/90 backdrop-blur flex items-center justify-center shrink-0 shadow-lg">
                    <span className="text-xl sm:text-2xl font-bold text-cares-600">{f.facility_name.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight drop-shadow-sm truncate">{f.facility_name}</h1>
                    <span className="shrink-0 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500 text-white">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      公式
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {f.service_type && <p className="text-xs sm:text-sm text-white/80 font-medium">{f.service_type}</p>}
                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ===== MAIN INFO CARD ===== */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 mb-6 shadow-sm">
          {/* Name + badges (only show if no hero) */}
          {!(isOwnerVerified && portalProfile?.cover_image_url) && (
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
          {isOwnerVerified && portalProfile?.cover_image_url && f.jigyosho_number && (
            <p className="text-sm text-gray-500 font-mono mb-3">
              事業所番号: {f.jigyosho_number}
            </p>
          )}

          {/* Details */}
          <div className={`space-y-2 ${!(isOwnerVerified && portalProfile?.cover_image_url) ? 'mt-4' : ''}`}>
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
            {f.capacity && (
              <div className="flex items-center gap-2 text-base text-gray-600">
                <Users className="w-4 h-4 shrink-0 text-gray-400" />
                <span>定員: {f.capacity}名</span>
              </div>
            )}
          </div>

          {/* Owner-only: Action buttons + Overview + Features */}
          {isOwnerVerified && portalProfile && (
            <>
              <div className="flex flex-wrap gap-2 mt-4">
                {portalDocuments.length > 0 && (
                  <a href={portalDocuments[0].file_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                    <Download className="w-4 h-4" />
                    パンフレット
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

          {/* Edit proposal button at bottom of header */}
          <div className="mt-4 pt-4 border-t border-gray-100">
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

        {/* ===== VACANCY SECTION ===== */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-3">空き状況</h2>

          {hasVacancyData ? (
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-500">直近30日のコミュニティ情報:</p>
              <div className="flex items-center gap-4 flex-wrap">
                {vacancySummary.has_vacancy > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    空きの可能性あり ({vacancySummary.has_vacancy}件)
                  </span>
                )}
                {vacancySummary.no_vacancy > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    空きなしの可能性 ({vacancySummary.no_vacancy}件)
                  </span>
                )}
              </div>
              {vacancySummary.latest_report_at && (
                <p className="text-xs text-gray-400">
                  最終レポート: {getRelativeTime(vacancySummary.latest_report_at)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-4">まだ空き情報の投稿がありません</p>
          )}

          {/* Client-side interactive parts */}
          <DirectoryDetailClient
            listingId={f.id}
            facilityName={f.facility_name}
            isOwnerVerified={isOwnerVerified}
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

        {/* ===== OWNER PORTAL: Posts Feed ===== */}
        {isOwnerVerified && portalPosts.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">施設からの投稿</h2>
            <div className="space-y-4">
              {portalPosts.map((post: any) => (
                <PortalPostCard key={post.id} post={post} facilityId={f.owner_facility_id} />
              ))}
            </div>
          </div>
        )}

        {/* Attribution */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">
            出典: 介護サービス情報公表システム
          </p>
        </div>
      </div>

      {/* Fee simulator (owner-verified with fees only) */}
      {isOwnerVerified && portalFees.length > 0 && (
        <FloatingActions fees={portalFees} feePattern={portalProfile?.fee_pattern} />
      )}
    </>
  )
}
