import { NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'

type CommunityPost = {
  id: string
  post_kind: 'review' | 'note' | 'photo' | 'brochure'
  content: string
  rating: number | null
  created_at: string
}

type CommunityMedia = {
  id: string
  post_id: string
  storage_path: string
  file_name: string
  mime_type: string
  sort_order: number
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = getSupabaseServiceClient()
    const { data: listing } = await supabase
      .from('cares_listings')
      .select('jigyosho_number')
      .eq('id', id)
      .maybeSingle()

    if (!listing?.jigyosho_number) {
      return NextResponse.json({ posts: [] })
    }

    const { data: master } = await supabase
      .from('facility_master_data')
      .select('id')
      .eq('jigyosho_number', listing.jigyosho_number)
      .maybeSingle()

    if (!master) return NextResponse.json({ posts: [] })

    const { data: posts, error: postsError } = await supabase
      .from('service_facility_community_posts')
      .select('id, post_kind, content, rating, created_at')
      .eq('facility_master_id', master.id)
      .eq('moderation_status', 'published')
      .eq('share_on_cares', true)
      .order('created_at', { ascending: false })
      .limit(30)

    if (postsError) {
      console.error('Cares community posts query error:', postsError)
      return NextResponse.json({ error: '共有情報を取得できませんでした' }, { status: 500 })
    }

    const postRows = (posts || []) as CommunityPost[]
    const postIds = postRows.map(post => post.id)
    const { data: media, error: mediaError } = postIds.length > 0
      ? await supabase
          .from('service_facility_community_media')
          .select('id, post_id, storage_path, file_name, mime_type, sort_order')
          .in('post_id', postIds)
          .order('sort_order')
      : { data: [], error: null }

    if (mediaError) {
      console.error('Cares community media query error:', mediaError)
      return NextResponse.json({ error: '共有資料を取得できませんでした' }, { status: 500 })
    }

    const mediaRows = (media || []) as CommunityMedia[]
    const signedUrls = new Map<string, string>()
    await Promise.all(mediaRows.map(async item => {
      const { data } = await supabase.storage
        .from('service-facility-media')
        .createSignedUrl(item.storage_path, 3600)
      if (data?.signedUrl) signedUrls.set(item.storage_path, data.signedUrl)
    }))

    return NextResponse.json({
      posts: postRows.map(post => ({
        id: post.id,
        kind: post.post_kind,
        content: post.content,
        rating: post.rating,
        createdAt: post.created_at,
        media: mediaRows
          .filter(item => item.post_id === post.id && signedUrls.has(item.storage_path))
          .map(item => ({
            id: item.id,
            url: signedUrls.get(item.storage_path),
            fileName: item.file_name,
            mimeType: item.mime_type,
          })),
      })),
    })
  } catch (error) {
    console.error('Cares community API error:', error)
    return NextResponse.json({ error: '共有情報を取得できませんでした' }, { status: 500 })
  }
}
