import { cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Building2, ExternalLink } from 'lucide-react'
import { getPublicPost } from '@/lib/public-post'
import { postMedia, publicWebUrl } from '@/lib/profile-media'
import FacilityHearts from '@/components/FacilityHearts'
import PostShareButton from '@/components/PostShareButton'
import LikeButton from '@/components/LikeButton'
import CommentSection from '@/components/CommentSection'
import ViewTracker from '@/components/ViewTracker'

export const dynamic = 'force-dynamic'
const load = cache(getPublicPost)
type Props = { params: Promise<{ id: string; postId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, postId } = await params
  const result = await load(id, postId)
  if (!result) return { title: '投稿が見つかりません', robots: { index: false } }
  const { facility, post } = result
  const title = `${post.title || '日々のようす'}｜${facility.name}`
  const description = `${post.content.slice(0, 110)}${result.listingId ? ' — 登録なしで、この事業所にハートで応援を送れます。' : ''}`
  const url = `https://cares.carespace.jp/facility/${id}/posts/${postId}`
  const photo = postMedia(post).find(media => media.type === 'image')
  const images = photo ? [{ url: photo.url, alt: post.title || facility.name }] : []
  return { title, description, alternates: { canonical: url },
    openGraph: { title, description, url, type: 'article', images },
    twitter: { card: photo ? 'summary_large_image' : 'summary', title, description, images: photo ? [photo.url] : [] } }
}

export default async function PublicPostPage({ params }: Props) {
  const { id, postId } = await params
  const result = await load(id, postId)
  if (!result) notFound()
  const { facility, post, listingId } = result
  const media = postMedia(post)
  return <article className="mx-auto max-w-2xl px-3 pb-12 sm:px-6">
    <ViewTracker postId={post.id} />
    <Link href={`/facility/${id}`} className="inline-flex min-h-12 items-center gap-2 text-xs font-semibold text-slate-600"><ArrowLeft className="h-4 w-4" />事業所のページへ</Link>
    <div className="rounded-3xl border border-rose-100 bg-white p-4 sm:p-6">
      <Link href={`/facility/${id}`} className="flex min-w-0 items-center gap-3">
        {publicWebUrl(facility.icon) ? <img src={publicWebUrl(facility.icon)} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" /> : <Building2 className="h-10 w-10 shrink-0 rounded-full bg-rose-50 p-2 text-rose-600" />}
        <p className="line-clamp-2 min-w-0 text-sm font-bold text-slate-800">{facility.name}</p>
      </Link>
      <h1 className="mt-3 line-clamp-3 text-xl font-extrabold leading-snug text-slate-950 sm:text-2xl">{post.title || '日々のようす'}</h1>
      <p className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{post.content}</p>
      <div className="mt-4"><FacilityHearts facilityId={id} listingId={listingId} variant="quick" /></div>
      <div className="mt-3 text-center"><PostShareButton facilityId={id} facilityName={facility.name} postId={post.id} title={post.title} canSupport={Boolean(listingId)} /></div>
    </div>
    <div className="mt-4 space-y-2 overflow-hidden rounded-2xl">
      {media.map(item => item.type === 'video' ? <video key={item.id} src={item.url} controls playsInline preload="metadata" className="max-h-[75dvh] w-full bg-black" /> :
        <img key={item.id} src={item.url} alt={post.title || `${facility.name}の投稿写真`} className="h-auto w-full bg-rose-50 object-contain" />)}
    </div>
    <div className="mt-5 rounded-2xl bg-white p-4 sm:p-6">
      <p className="text-xs text-slate-500">{new Date(post.created_at).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
      {post.title && <h2 className="mt-2 break-words text-lg font-bold">{post.title}</h2>}
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{post.content}</p>
      {publicWebUrl(post.link_url) && <a href={publicWebUrl(post.link_url)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-rose-700">関連ページを見る<ExternalLink className="h-4 w-4" /></a>}
      <details className="mt-5 border-t border-slate-100 pt-3"><summary className="cursor-pointer py-2 text-xs text-slate-500">会員向け：この投稿へのいいね</summary><LikeButton postId={post.id} initialLikeCount={post.like_count || 0} /></details>
      <div className="mt-4 border-t border-slate-100 pt-4"><CommentSection postId={post.id} facilityId={id} /></div>
    </div>
  </article>
}
