import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseServiceClient } from '@/lib/supabase'
import { createAuthServerClient } from '@/lib/supabase-server-auth'
import crypto from 'crypto'

function getIpHash(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  return crypto.createHash('sha256').update(ip).digest('hex')
}

const ALLOWED_TYPES = ['care_manager', 'msw', 'nurse', 'therapist', 'counselor', 'doctor', 'other']
const FREE_FACILITY_LIMIT = 3
const FREE_NOTE_PREVIEW = 3

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseClient()

    // Check if user is logged in
    const authSupabase = await createAuthServerClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    // Fetch all notes for this listing
    const { data, error } = await supabase
      .from('cares_professional_notes')
      .select('id, reporter_type, content, created_at')
      .eq('listing_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 })
    }

    const notes = data || []

    // Logged-in users: return all notes without restriction
    if (user) {
      return NextResponse.json({ notes, limited: false, remaining_count: 0 })
    }

    // Not logged in: check daily view limit per IP
    const ipHash = getIpHash(request)
    const serviceClient = getSupabaseServiceClient()
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // Count distinct facilities viewed today by this IP
    const { data: viewLogs, error: viewError } = await serviceClient
      .from('cares_note_view_logs')
      .select('listing_id')
      .eq('ip_hash', ipHash)
      .eq('viewed_date', today)

    if (viewError) {
      console.error('View log query error:', viewError)
      // On error, return notes without restriction to avoid breaking the page
      return NextResponse.json({ notes, limited: false, remaining_count: 0 })
    }

    // Get unique facility IDs viewed today
    const viewedFacilityIds = new Set((viewLogs || []).map((log) => log.listing_id))

    // If current facility is already viewed today, don't count it again
    const alreadyViewed = viewedFacilityIds.has(id)
    const viewedCount = viewedFacilityIds.size

    if (viewedCount < FREE_FACILITY_LIMIT || alreadyViewed) {
      // Under limit or already counted: return all notes
      // Log the view if not already logged today
      if (!alreadyViewed) {
        await serviceClient
          .from('cares_note_view_logs')
          .insert({
            ip_hash: ipHash,
            listing_id: id,
            viewed_date: today,
          })
      }

      return NextResponse.json({ notes, limited: false, remaining_count: 0 })
    }

    // Over limit: return only preview notes
    const previewNotes = notes.slice(0, FREE_NOTE_PREVIEW)
    const remainingCount = Math.max(0, notes.length - FREE_NOTE_PREVIEW)

    return NextResponse.json({
      notes: previewNotes,
      limited: true,
      remaining_count: remainingCount,
    })
  } catch {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { reporter_type, content } = body

    if (!reporter_type || !ALLOWED_TYPES.includes(reporter_type)) {
      return NextResponse.json({ error: '職種を選択してください' }, { status: 400 })
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'メモ内容を入力してください' }, { status: 400 })
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'メモは500文字以内で入力してください' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()
    const ipHash = getIpHash(request)

    // Check if user is logged in
    const authSupabase = await createAuthServerClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    // Check listing exists
    const { data: listing } = await supabase
      .from('cares_listings')
      .select('id')
      .eq('id', id)
      .single()

    if (!listing) {
      return NextResponse.json({ error: '事業所が見つかりません' }, { status: 404 })
    }

    // Rate limit: max 5 notes per ip per day
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const { count } = await supabase
      .from('cares_professional_notes')
      .select('*', { count: 'exact', head: true })
      .eq('reporter_ip_hash', ipHash)
      .gte('created_at', oneDayAgo.toISOString())

    if ((count || 0) >= 5) {
      return NextResponse.json({ error: '1日の投稿上限に達しました' }, { status: 429 })
    }

    // Build insert data
    const insertData: Record<string, string> = {
      listing_id: id,
      reporter_type,
      content: content.trim(),
      reporter_ip_hash: ipHash,
    }

    // If logged in, attach user_id and use display_name as reporter_name
    if (user) {
      insertData.user_id = user.id

      const { data: profile } = await supabase
        .from('cares_user_profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single()

      if (profile?.display_name) {
        insertData.reporter_name = profile.display_name
      }
    }

    const { error } = await supabase
      .from('cares_professional_notes')
      .insert(insertData)

    if (error) {
      console.error('Note insert error:', error)
      return NextResponse.json({ error: '投稿に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Notes API error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
