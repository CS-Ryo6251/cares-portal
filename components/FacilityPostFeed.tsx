'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Camera, ChevronRight, Copy, FileText, Play, X } from 'lucide-react'
import { postCategory, postMedia, profileCategories, publicWebUrl, type ProfilePost } from '@/lib/profile-media'
import LikeButton from './LikeButton'
import CommentSection from './CommentSection'
import ViewTracker from './ViewTracker'
import FacilityHearts from './FacilityHearts'
import PostShareButton from './PostShareButton'

function ProfileDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const dialog = ref.current
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog?.showModal()
    return () => { dialog?.close(); document.body.style.overflow = previous; opener?.focus() }
  }, [])
  return <dialog ref={ref} aria-label={title} onCancel={event => { event.preventDefault(); onClose() }}
    onClick={event => { if (event.target === ref.current) onClose() }}
    className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%_-_24px)] max-w-2xl overflow-y-auto overscroll-contain rounded-3xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60">
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-3 backdrop-blur">
      <h2 className="truncate text-sm font-bold">{title}</h2><button onClick={onClose} aria-label="閉じる" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-slate-100"><X className="h-5 w-5" /></button>
    </div>
    {children}
  </dialog>
}

function Photo({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [broken, setBroken] = useState(false)
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => {
    setBroken(Boolean(ref.current?.complete && !ref.current.naturalWidth))
  }, [src])
  if (broken) return <div className={`${className} flex items-center justify-center bg-rose-50 text-xs text-slate-500`}><Camera className="mr-2 h-5 w-5" />写真を表示できません</div>
  return <img ref={ref} src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} className={className} />
}

export function FacilityPhotoGallery({ photos, name }: { photos: string[]; name: string }) {
  const [selected, setSelected] = useState<string | null>(null)
  return <div className="px-4 pb-5 sm:px-0">
    <h2 className="mb-4 text-lg font-bold text-slate-900">事業所のアルバム <span className="ml-2 text-sm font-normal text-slate-400">{photos.length}</span></h2>
    {photos.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">{photos.map((photo, index) => <button key={photo} onClick={() => setSelected(photo)} aria-label={`写真${index + 1}を大きく見る`} className="aspect-square overflow-hidden rounded-2xl bg-rose-50"><Photo src={photo} alt={`${name}の写真 ${index + 1}`} className="h-full w-full object-cover transition hover:scale-105" /></button>)}</div> :
      <div className="rounded-2xl bg-white p-10 text-center text-sm leading-7 text-slate-500"><Camera className="mx-auto mb-3 h-8 w-8 text-rose-300" />写真はまだありません。<br />事業所から届く日々のようすをお楽しみに。</div>}
    {selected && <ProfileDialog title={name + 'の写真'} onClose={() => setSelected(null)}><Photo src={selected} alt={name + 'の写真'} className="h-auto max-h-[75dvh] w-full object-contain" /></ProfileDialog>}
  </div>
}

export default function FacilityPostFeed({ posts, facilityId, facilityName, listingId, initialCategory = '', unavailable = false, totalCount }: {
  posts: ProfilePost[]; facilityId: string; facilityName: string; listingId?: string; initialCategory?: string; unavailable?: boolean; totalCount?: number
}) {
  const [category, setCategory] = useState(initialCategory)
  const [selected, setSelected] = useState<ProfilePost | null>(null)
  useEffect(() => {
    function openHash() {
      const id = window.location.hash.slice(1)
      setSelected(posts.find(post => 'post-' + post.id === id || 'comments-' + post.id === id) || null)
    }
    openHash(); window.addEventListener('hashchange', openHash)
    return () => window.removeEventListener('hashchange', openHash)
  }, [posts])
  function openPost(post: ProfilePost) {
    setSelected(post)
    window.history.replaceState(null, '', window.location.pathname + window.location.search + '#post-' + post.id)
  }
  function closePost() {
    setSelected(null)
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }
  const visible = posts.filter(post => !category || postCategory(post.category) === category)
  const categories = profileCategories.filter(item => !item.key || posts.some(post => postCategory(post.category) === item.key))
  const selectedMedia = selected ? postMedia(selected) : []
  return <div className="px-4 pb-5 sm:px-0">
    <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">日々のようす・お知らせ</h2><p className="mt-1 text-xs text-slate-500">写真や投稿から、事業所のふだんを。</p></div><Camera className="h-5 w-5 text-rose-500" /></div>
    {categories.length > 1 && <nav aria-label="投稿のカテゴリ" className="mb-5 flex gap-2 overflow-x-auto pb-1">{categories.map(item => <button key={item.key} aria-pressed={category === item.key} onClick={() => setCategory(item.key)} className={`min-h-11 shrink-0 rounded-full px-4 text-xs font-bold ${category === item.key ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{item.label}</button>)}</nav>}
    {unavailable ? <p role="alert" className="rounded-2xl bg-white p-8 text-sm text-slate-600">投稿を読み込めませんでした。時間をおいて再読み込みしてください。</p> :
      visible.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-8">
        {visible.map(post => {
          const media = postMedia(post)
          const label = profileCategories.find(item => item.key === postCategory(post.category))?.label || 'お知らせ'
          return <button key={post.id} id={'post-' + post.id} onClick={() => openPost(post)} className="group min-w-0 scroll-mt-24 text-left" aria-label={(post.title || label) + 'の投稿を読む'}>
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-rose-50">
              {media[0]?.type === 'image' ? <Photo src={media[0].url} alt={post.title || facilityName + 'の投稿写真'} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> :
                media[0]?.type === 'video' ? <div className="flex h-full items-center justify-center bg-slate-800 text-white"><Play className="h-10 w-10 fill-current" /><span className="sr-only">動画の投稿</span></div> :
                  <div className="flex h-full flex-col justify-center bg-gradient-to-br from-orange-50 to-rose-100 p-4 sm:p-6"><FileText className="mb-3 h-5 w-5 text-rose-400" /><p className="line-clamp-4 text-sm font-bold leading-6 text-rose-950 sm:text-base">{post.title || post.content}</p></div>}
              {media.length > 1 && <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] font-bold text-white"><Copy className="h-3 w-3" />{media.length}</span>}
              <span className="absolute bottom-2 left-2 max-w-[calc(100%-16px)] truncate rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-slate-700">{label}</span>
            </div>
            <p className="mt-2.5 text-[11px] text-slate-400">{new Date(post.created_at).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
            <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-slate-900 group-hover:text-rose-700">{post.title || label}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{post.content}</p>
          </button>
        })}
      </div> : <div className="rounded-2xl bg-white p-10 text-center text-sm leading-7 text-slate-500"><Camera className="mx-auto mb-3 h-8 w-8 text-rose-300" />{category ? 'このカテゴリの投稿はまだありません。' : 'これから届く、事業所の日々のようす。'}<br />新しい投稿をお楽しみに。</div>}
    {totalCount && totalCount > posts.length ? <p className="mt-5 text-xs text-slate-500">全{totalCount}件のうち、最新{posts.length}件を表示しています。</p> : null}
    {selected && <ProfileDialog title={facilityName} onClose={closePost}>
      <ViewTracker postId={selected.id} />
      <div className="p-3 sm:p-5">
        <h3 className="mb-3 line-clamp-2 text-lg font-bold">{selected.title || '日々のようす'}</h3>
        <FacilityHearts key={selected.id} facilityId={facilityId} listingId={listingId} variant="quick" />
        <div className="mt-3 text-center"><PostShareButton facilityId={facilityId} facilityName={facilityName} postId={selected.id} title={selected.title} canSupport={Boolean(listingId)} /></div>
      </div>
      <div className="space-y-2">{selectedMedia.map((media, index) => media.type === 'video' ?
        <video key={media.id} src={media.url} controls playsInline preload="metadata" className="max-h-[65dvh] w-full bg-black" /> :
        <Photo key={media.id} src={media.url} alt={(selected.title || facilityName) + ' 写真' + (index + 1)} className="max-h-[65dvh] w-full bg-slate-50 object-contain" />)}</div>
      <div className="p-5 sm:p-7">
        <p className="text-xs text-slate-400">{new Date(selected.created_at).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
        {selected.title && <h3 className="mt-2 text-xl font-bold leading-snug">{selected.title}</h3>}
        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{selected.content}</p>
        {publicWebUrl(selected.link_url) && <a href={publicWebUrl(selected.link_url)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-rose-700">関連ページを見る<ChevronRight className="h-4 w-4" /></a>}
        <details className="mt-5 border-t border-slate-100 pt-4"><summary className="cursor-pointer py-2 text-xs text-slate-500">会員向け：この投稿へのいいね</summary><LikeButton key={selected.id} postId={selected.id} initialLikeCount={selected.like_count || 0} /></details>
        <div id={'comments-' + selected.id} className="mt-5 border-t border-slate-100 pt-4"><CommentSection key={selected.id} postId={selected.id} facilityId={facilityId} /></div>
      </div>
    </ProfileDialog>}
  </div>
}
