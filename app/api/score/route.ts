import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseServiceClient } from '@/lib/supabase'
import { calculateCompletenessScore, type ScoreInputData } from '@/lib/score'

// --------------- データ取得 ---------------

async function fetchScoreInputData(
  listingId: string,
  supabase: ReturnType<typeof getSupabaseClient>
): Promise<ScoreInputData | null> {
  // 1. cares_listings 基本情報
  const { data: listing, error: listingError } = await supabase
    .from('cares_listings')
    .select('id, facility_name, address, prefecture, city, phone, service_type, corporation_name, capacity, jigyosho_number, acceptance_status, overview, features, website_url, is_owner_verified, owner_facility_id')
    .eq('id', listingId)
    .single()

  if (listingError || !listing) return null

  // 2-6: 並列クエリ
  const [
    vacancyResult,
    notesResult,
    listingFeesResult,
    portalProfileResult,
  ] = await Promise.all([
    // 2. cares_vacancy_reports
    supabase
      .from('cares_vacancy_reports')
      .select('id, listing_id, vacancy_type, reported_at')
      .eq('listing_id', listingId),

    // 3. cares_professional_notes
    supabase
      .from('cares_professional_notes')
      .select('id, listing_id, reporter_type, created_at')
      .eq('listing_id', listingId),

    // 4. cares_listing_fees
    supabase
      .from('cares_listing_fees')
      .select('id, listing_id, fee_type, source, created_at')
      .eq('listing_id', listingId),

    // 5. facility_portal_profiles（cares_listings.owner_facility_id → facility_portal_profiles.facility_id）
    listing.owner_facility_id
      ? supabase
          .from('facility_portal_profiles')
          .select('is_published, facility_id')
          .eq('facility_id', listing.owner_facility_id)
          .eq('is_published', true)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // ポータルプロフィールのfacility_idを使って追加データ取得
  const portalProfile = portalProfileResult.data
  const isOwnerVerified = !!listing.is_owner_verified
  let portalPosts: ScoreInputData['portalPosts'] = []
  let portalFees: ScoreInputData['portalFees'] = []
  let portalDocuments: ScoreInputData['portalDocuments'] = []

  if (portalProfile?.facility_id) {
    const facilityId = portalProfile.facility_id

    const [postsResult, feesResult, docsResult] = await Promise.all([
      // 6. facility_portal_posts（公式投稿）
      supabase
        .from('facility_portal_posts')
        .select('id, created_at, status')
        .eq('facility_id', facilityId)
        .eq('status', 'published'),

      // 7. facility_portal_fees（公式料金）
      supabase
        .from('facility_portal_fees')
        .select('id, fee_type, category')
        .eq('facility_id', facilityId),

      // 8. facility_portal_documents（パンフレット）
      supabase
        .from('facility_portal_documents')
        .select('id, document_type')
        .eq('facility_id', facilityId),
    ])

    portalPosts = postsResult.data || []
    portalFees = feesResult.data || []
    portalDocuments = docsResult.data || []
  }

  return {
    listing,
    vacancyReports: vacancyResult.data || [],
    professionalNotes: notesResult.data || [],
    listingFees: listingFeesResult.data || [],
    portalProfile: isOwnerVerified ? {
      is_owner_verified: true,
      owner_facility_id: listing.owner_facility_id,
    } : null,
    portalPosts,
    portalFees,
    portalDocuments,
  }
}

// --------------- GET: 単一施設のスコア計算 ---------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const listingId = searchParams.get('listing_id')

    if (!listingId) {
      return NextResponse.json(
        { error: 'listing_id パラメータは必須です' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()
    const inputData = await fetchScoreInputData(listingId, supabase)

    if (!inputData) {
      return NextResponse.json(
        { error: '施設が見つかりません' },
        { status: 404 }
      )
    }

    const result = calculateCompletenessScore(inputData)

    // DBに保存（service role key使用）
    const serviceClient = getSupabaseServiceClient()
    await serviceClient
      .from('cares_listings')
      .update({
        completeness_score: Math.round(result.score),
        completeness_tier: result.tier,
        completeness_calculated_at: new Date().toISOString(),
      })
      .eq('id', listingId)

    return NextResponse.json({
      listing_id: listingId,
      ...result,
    })
  } catch (error) {
    console.error('Score API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// --------------- POST: バッチ計算 ---------------

export async function POST(request: NextRequest) {
  try {
    // 認証チェック: バッチ計算は管理者のみ
    const authHeader = request.headers.get('authorization')
    const expectedKey = process.env.SCORE_API_KEY
    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const mode = body.mode || 'uncalculated'  // 'uncalculated' | 'all'
    const batchSize = Math.min(body.batch_size || 100, 500)

    const serviceClient = getSupabaseServiceClient()

    // 対象施設を取得
    let query = serviceClient
      .from('cares_listings')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(batchSize)

    if (mode === 'uncalculated') {
      query = query.is('completeness_calculated_at', null)
    }

    const { data: listings, error: listError } = await query

    if (listError) {
      console.error('Batch listing fetch error:', listError)
      return NextResponse.json(
        { error: 'バッチ対象の取得に失敗しました' },
        { status: 500 }
      )
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({
        processed: 0,
        message: '計算対象の施設がありません',
      })
    }

    const supabase = getSupabaseClient()
    let processed = 0
    let errors = 0
    const results: Array<{ listing_id: string; score: number; tier: string }> = []

    for (const { id } of listings) {
      try {
        const inputData = await fetchScoreInputData(id, supabase)
        if (!inputData) {
          errors++
          continue
        }

        const result = calculateCompletenessScore(inputData)

        await serviceClient
          .from('cares_listings')
          .update({
            completeness_score: Math.round(result.score),
            completeness_tier: result.tier,
            completeness_calculated_at: new Date().toISOString(),
          })
          .eq('id', id)

        results.push({
          listing_id: id,
          score: result.score,
          tier: result.tier,
        })
        processed++
      } catch (err) {
        console.error(`Score calculation error for ${id}:`, err)
        errors++
      }
    }

    return NextResponse.json({
      processed,
      errors,
      total_target: listings.length,
      results,
    })
  } catch (error) {
    console.error('Batch score API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
