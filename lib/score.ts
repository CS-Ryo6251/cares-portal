// ============================================================
// 施設情報充実度スコア計算ロジック
// ============================================================
// 純粋関数。DB取得はAPI側で行い、取得したデータを引数として渡す。
// スコアは0-100点で正規化し、5段階のティアに分類する。
// ============================================================

// --------------- 型定義 ---------------

export type ScoreBreakdown = {
  A1: number; A2: number; A3: number                                    // 空き・受入 (25点)
  B1: number; B2: number; B3: number; B4: number; B5: number; B6: number; B7: number  // 基本情報 (20点)
  C1: number; C2: number; C3: number                                    // 料金 (18点)
  D1: number; D2: number; D3: number                                    // 専門職メモ (15点)
  E1: number; E2: number; E3: number                                    // 概要・特徴 (12点)
  F1: number; F2: number; F3: number                                    // 公式認証 (10点)
}

export type CategoryScore = {
  score: number
  max: number
}

export type ScoreResult = {
  score: number       // 0-100
  tier: 'insufficient' | 'basic' | 'good' | 'high' | 'complete'
  breakdown: ScoreBreakdown
  categoryScores: {
    vacancy: CategoryScore      // A
    basic: CategoryScore        // B
    fees: CategoryScore         // C
    notes: CategoryScore        // D
    overview: CategoryScore     // E
    official: CategoryScore     // F
  }
}

// --- 入力データ型 ---

export type VacancyReport = {
  id: string
  listing_id: string
  vacancy_type: string
  reported_at: string
}

export type ProfessionalNote = {
  id: string
  listing_id: string
  reporter_type: string
  created_at: string
}

export type ListingFee = {
  id: string
  listing_id: string
  fee_type: string
  source: string | null
  created_at: string
}

export type FacilityPortalFee = {
  id: string
  fee_type?: string
  category?: string
}

export type FacilityPortalPost = {
  id: string
  created_at: string
  status: string
}

export type FacilityPortalDocument = {
  id: string
  document_type?: string
}

export type ScoreInputData = {
  // cares_listings 基本情報
  listing: {
    id: string
    facility_name: string | null
    address: string | null
    prefecture: string | null
    city: string | null
    phone: string | null
    service_type: string | null
    corporation_name: string | null
    capacity: number | null
    jigyosho_number: string | null
    acceptance_status: string | null
    overview: string | null
    features: string[] | null
    website_url: string | null
  }

  // cares_vacancy_reports（listing_id紐づき、全件）
  vacancyReports: VacancyReport[]

  // cares_professional_notes（listing_id紐づき、全件）
  professionalNotes: ProfessionalNote[]

  // cares_listing_fees（listing_id紐づき）
  listingFees: ListingFee[]

  // facility_portal_profiles（owner_facility_id紐づき）
  portalProfile: {
    is_owner_verified: boolean
    owner_facility_id: string | null
  } | null

  // facility_portal_posts（公式投稿）
  portalPosts: FacilityPortalPost[]

  // facility_portal_fees（公式料金）
  portalFees: FacilityPortalFee[]

  // facility_portal_documents（パンフレット等）
  portalDocuments: FacilityPortalDocument[]

  // 計算基準日（テスト用にオーバーライド可能）
  now?: Date
}

// --------------- サービス種別倍率 ---------------

type ServiceCategory = 'residential' | 'daycare' | 'home_visit' | 'care_management' | 'other'

const SERVICE_TYPE_CATEGORY: Record<string, ServiceCategory> = {
  // 入所系
  '介護老人福祉施設': 'residential',
  '特別養護老人ホーム': 'residential',
  '介護老人保健施設': 'residential',
  '介護療養型医療施設': 'residential',
  '介護医療院': 'residential',
  '認知症対応型共同生活介護': 'residential',
  'グループホーム': 'residential',
  '特定施設入居者生活介護（有料老人ホーム）': 'residential',
  '有料老人ホーム': 'residential',
  '特定施設入居者生活介護（軽費老人ホーム）': 'residential',
  '特定施設入居者生活介護（サービス付き高齢者向け住宅）': 'residential',
  'サービス付き高齢者向け住宅': 'residential',
  '短期入所生活介護': 'residential',
  '短期入所療養介護（介護老人保健施設）': 'residential',
  '短期入所療養介護（介護療養型医療施設）': 'residential',
  '短期入所療養介護（介護医療院）': 'residential',
  '地域密着型介護老人福祉施設入所者生活介護': 'residential',

  // 通所系
  '通所介護': 'daycare',
  '通所介護（療養通所介護）': 'daycare',
  '通所リハビリテーション': 'daycare',
  '認知症対応型通所介護': 'daycare',
  '小規模多機能型居宅介護': 'daycare',
  '看護小規模多機能型居宅介護': 'daycare',
  '地域密着型通所介護': 'daycare',

  // 訪問系
  '訪問介護': 'home_visit',
  '訪問入浴介護': 'home_visit',
  '訪問看護': 'home_visit',
  '訪問リハビリテーション': 'home_visit',
  '夜間対応型訪問介護': 'home_visit',
  '定期巡回・随時対応型訪問介護看護': 'home_visit',

  // 居宅・包括
  '居宅介護支援': 'care_management',
  '居宅介護支援事業所': 'care_management',
  '地域包括支援センター': 'care_management',

  // 複合・福祉用具
  '福祉用具貸与': 'other',
  '特定福祉用具販売': 'other',
}

// 倍率テーブル: [A倍率, C倍率, D倍率]
const CATEGORY_MULTIPLIERS: Record<ServiceCategory, [number, number, number]> = {
  residential:      [1.0, 1.0, 1.0],  // 入所系: 標準
  daycare:          [0.9, 0.8, 1.0],  // 通所系: 空き・料金やや低め
  home_visit:       [0.7, 0.6, 1.0],  // 訪問系: 空き・料金の重要度低い
  care_management:  [0.5, 0.3, 1.2],  // 居宅・包括: メモ重視、空き・料金は低い
  other:            [0.6, 0.5, 0.8],  // 複合・福祉用具
}

// --------------- ユーティリティ関数 ---------------

/**
 * 対数スコア: maxPoints * min(1, ln(count+1) / ln(threshold+1))
 */
function logScore(count: number, maxPoints: number, threshold: number): number {
  if (count <= 0) return 0
  const raw = maxPoints * Math.min(1, Math.log(count + 1) / Math.log(threshold + 1))
  return Math.round(raw * 100) / 100
}

/**
 * 鮮度減衰関数
 * elapsed / validDays の比率で減衰:
 *   <= 1.0: 100%
 *   <= 1.5: 75%
 *   <= 2.0: 50%
 *   > 2.0: 25%
 */
function freshnessDecay(elapsedDays: number, validDays: number): number {
  const ratio = elapsedDays / validDays
  if (ratio <= 1.0) return 1.0
  if (ratio <= 1.5) return 0.75
  if (ratio <= 2.0) return 0.5
  return 0.25
}

/**
 * 経過日数を計算
 */
function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)))
}

/**
 * ティア判定
 */
function determineTier(score: number): ScoreResult['tier'] {
  if (score >= 80) return 'complete'
  if (score >= 60) return 'high'
  if (score >= 40) return 'good'
  if (score >= 20) return 'basic'
  return 'insufficient'
}

// --------------- メイン計算関数 ---------------

export function calculateCompletenessScore(data: ScoreInputData): ScoreResult {
  const now = data.now ?? new Date()
  const listing = data.listing

  // サービス種別カテゴリ判定
  const serviceCategory: ServiceCategory =
    (listing.service_type && SERVICE_TYPE_CATEGORY[listing.service_type]) || 'other'
  const [multA, multC, multD] = CATEGORY_MULTIPLIERS[serviceCategory]

  // ==================== A. 空き・受入状況 (25点) ====================

  // A1 (8点): acceptance_status
  let A1 = 0
  if (listing.acceptance_status != null && listing.acceptance_status !== 'unknown') {
    A1 = 8
  } else if (listing.acceptance_status === 'unknown') {
    A1 = 2
  }

  // A2 (10点): 直近30日の空きレポート件数（鮮度減衰あり）
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const recentReports = data.vacancyReports.filter(r => {
    const reportedAt = new Date(r.reported_at)
    return reportedAt >= thirtyDaysAgo
  })

  // 鮮度減衰を適用した有効件数
  let effectiveReportCount = 0
  for (const report of recentReports) {
    const elapsed = daysBetween(new Date(report.reported_at), now)
    effectiveReportCount += freshnessDecay(elapsed, 30)
  }
  const A2 = logScore(effectiveReportCount, 10, 6)

  // A3 (7点): 最新レポートからの経過日数
  let A3 = 0
  if (data.vacancyReports.length > 0) {
    const latestReport = data.vacancyReports.reduce((latest, r) => {
      return new Date(r.reported_at) > new Date(latest.reported_at) ? r : latest
    })
    const elapsed = daysBetween(new Date(latestReport.reported_at), now)
    if (elapsed <= 7) A3 = 7
    else if (elapsed <= 14) A3 = 5
    else if (elapsed <= 30) A3 = 3
    else A3 = 0
  }

  // ==================== B. 基本情報 (20点) ====================

  const B1 = listing.facility_name ? 3 : 0
  const B2 = listing.address
    ? (listing.prefecture && listing.city ? 4 : 3)
    : 0
  const B3 = listing.phone ? 4 : 0
  const B4 = listing.service_type ? 3 : 0
  const B5 = listing.corporation_name ? 2 : 0
  const B6 = (listing.capacity != null && listing.capacity > 0) ? 2 : 0
  const B7 = listing.jigyosho_number ? 2 : 0

  // ==================== C. 料金情報 (18点) ====================

  // 合算料金件数（cares_listing_fees + facility_portal_fees）
  const totalFeeCount = data.listingFees.length + data.portalFees.length

  // C1 (10点): 料金件数の対数スコア
  const C1 = logScore(totalFeeCount, 10, 5)

  // C2 (5点): fee_type種類数
  const feeTypes = new Set<string>()
  for (const fee of data.listingFees) {
    if (fee.fee_type) feeTypes.add(fee.fee_type)
  }
  for (const fee of data.portalFees) {
    const feeType = fee.fee_type || fee.category
    if (feeType) feeTypes.add(feeType)
  }
  let C2 = 0
  if (feeTypes.size >= 3) C2 = 5
  else if (feeTypes.size === 2) C2 = 3
  else if (feeTypes.size === 1) C2 = 2

  // C3 (3点): source='owner'あり→3, コミュニティのみ→1, なし→0
  let C3 = 0
  const hasOwnerSource = data.listingFees.some(f => f.source === 'owner') || data.portalFees.length > 0
  const hasCommunitySource = data.listingFees.some(f => f.source === 'community')
  if (hasOwnerSource) C3 = 3
  else if (hasCommunitySource) C3 = 1

  // ==================== D. 専門職メモ (15点) ====================

  // D1 (7点): メモ件数の対数（鮮度減衰あり、有効期限180日）
  let effectiveNoteCount = 0
  for (const note of data.professionalNotes) {
    const elapsed = daysBetween(new Date(note.created_at), now)
    effectiveNoteCount += freshnessDecay(elapsed, 180)
  }
  const D1 = logScore(effectiveNoteCount, 7, 5)

  // D2 (4点): reporter_typeユニーク数
  const reporterTypes = new Set(data.professionalNotes.map(n => n.reporter_type))
  let D2 = 0
  if (reporterTypes.size >= 3) D2 = 4
  else if (reporterTypes.size === 2) D2 = 2.5
  else if (reporterTypes.size === 1) D2 = 1

  // D3 (4点): 最新メモの経過日数
  let D3 = 0
  if (data.professionalNotes.length > 0) {
    const latestNote = data.professionalNotes.reduce((latest, n) => {
      return new Date(n.created_at) > new Date(latest.created_at) ? n : latest
    })
    const elapsed = daysBetween(new Date(latestNote.created_at), now)
    if (elapsed <= 30) D3 = 4
    else if (elapsed <= 90) D3 = 3
    else if (elapsed <= 180) D3 = 2
    else D3 = 1
  }

  // ==================== E. 概要・特徴 (12点) ====================

  // E1 (5点): overview文字数
  let E1 = 0
  const overviewLength = listing.overview?.length ?? 0
  if (overviewLength >= 200) E1 = 5
  else if (overviewLength >= 100) E1 = 4
  else if (overviewLength >= 50) E1 = 3
  else if (overviewLength > 0) E1 = 1

  // E2 (4点): features配列長
  let E2 = 0
  const featureCount = listing.features?.length ?? 0
  if (featureCount >= 5) E2 = 4
  else if (featureCount >= 3) E2 = 3
  else if (featureCount >= 1) E2 = 2

  // E3 (3点): website_url存在
  const E3 = listing.website_url ? 3 : 0

  // ==================== F. 公式認証・活動 (10点) ====================

  // F1 (4点): is_owner_verified
  const F1 = data.portalProfile?.is_owner_verified ? 4 : 0

  // F2 (4点): 直近90日の公式投稿数の対数（鮮度減衰あり、90日）
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  let effectivePostCount = 0
  for (const post of data.portalPosts) {
    const postDate = new Date(post.created_at)
    if (postDate >= ninetyDaysAgo) {
      const elapsed = daysBetween(postDate, now)
      effectivePostCount += freshnessDecay(elapsed, 90)
    }
  }
  const F2 = logScore(effectivePostCount, 4, 5)

  // F3 (2点): パンフレット1件以上
  const F3 = data.portalDocuments.length > 0 ? 2 : 0

  // ==================== 倍率適用 & 正規化 ====================

  // カテゴリ別の素点（倍率適用前）
  const rawVacancy = A1 + A2 + A3
  const rawBasic = B1 + B2 + B3 + B4 + B5 + B6 + B7
  const rawFees = C1 + C2 + C3
  const rawNotes = D1 + D2 + D3
  const rawOverview = E1 + E2 + E3
  const rawOfficial = F1 + F2 + F3

  // カテゴリ最大点
  const maxVacancy = 25
  const maxBasic = 20
  const maxFees = 18
  const maxNotes = 15
  const maxOverview = 12
  const maxOfficial = 10
  const totalMax = maxVacancy + maxBasic + maxFees + maxNotes + maxOverview + maxOfficial  // 100

  // 倍率適用後のスコア（各カテゴリ上限を超えない）
  const adjVacancy = Math.min(rawVacancy * multA, maxVacancy)
  const adjFees = Math.min(rawFees * multC, maxFees)
  const adjNotes = Math.min(rawNotes * multD, maxNotes)

  // 倍率なしカテゴリ
  const adjBasic = Math.min(rawBasic, maxBasic)
  const adjOverview = Math.min(rawOverview, maxOverview)
  const adjOfficial = Math.min(rawOfficial, maxOfficial)

  // 合計スコア（100点上限）
  const rawTotal = adjVacancy + adjBasic + adjFees + adjNotes + adjOverview + adjOfficial
  const finalScore = Math.min(100, Math.round(rawTotal * 100) / 100)

  // ブレイクダウン（倍率適用前の素点を返す — カテゴリ別で倍率適用後を確認可能）
  const breakdown: ScoreBreakdown = {
    A1, A2: Math.round(A2 * 100) / 100, A3,
    B1, B2, B3, B4, B5, B6, B7,
    C1: Math.round(C1 * 100) / 100, C2, C3,
    D1: Math.round(D1 * 100) / 100, D2, D3,
    E1, E2, E3,
    F1, F2: Math.round(F2 * 100) / 100, F3,
  }

  return {
    score: Math.round(finalScore * 10) / 10,
    tier: determineTier(finalScore),
    breakdown,
    categoryScores: {
      vacancy: { score: Math.round(adjVacancy * 10) / 10, max: maxVacancy },
      basic:   { score: Math.round(adjBasic * 10) / 10, max: maxBasic },
      fees:    { score: Math.round(adjFees * 10) / 10, max: maxFees },
      notes:   { score: Math.round(adjNotes * 10) / 10, max: maxNotes },
      overview:{ score: Math.round(adjOverview * 10) / 10, max: maxOverview },
      official:{ score: Math.round(adjOfficial * 10) / 10, max: maxOfficial },
    },
  }
}
