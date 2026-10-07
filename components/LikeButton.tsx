'use client'
import { useState, useEffect, useRef } from 'react'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import LoginPromptModal from './LoginPromptModal'
async function request(url: string, init?: RequestInit) {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000)
  try { const response = await fetch(url, { ...init, cache: 'no-store', signal: controller.signal }); return { response, data: await response.json() } }
  finally { clearTimeout(timeout) }
}
export default function LikeButton({ postId, initialLikeCount }: { postId: string; initialLikeCount: number }) {
  const [liked, setLiked] = useState(false), [count, setCount] = useState(initialLikeCount)
  const [authenticated, setAuthenticated] = useState(false), [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  const [showLoginModal, setShowLoginModal] = useState(false), busy = useRef(false), router = useRouter()
  useEffect(() => {
    let active = true
    setReady(false); setError('')
    request(`/api/likes/status?post_ids=${postId}`).then(({ response, data }) => {
      if (!response.ok || !Number.isSafeInteger(data.counts?.[postId]) || data.counts[postId] < 0) throw new Error()
      if (!active) return
      setAuthenticated(data.authenticated === true); setLiked(data.liked_ids?.includes(postId) === true); setCount(data.counts[postId]); setReady(true)
    }).catch(() => { if (active) setError('いいねの状態を読み込めませんでした。') })
    return () => { active = false }
  }, [postId, retry])
  async function toggle() {
    if (!ready || busy.current) return
    if (!authenticated) { setShowLoginModal(true); return }
    busy.current = true; setLoading(true); setError('')
    try {
      const { response, data } = await request('/api/likes', { method: liked ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id: postId }) })
      if (response.status === 401) { setShowLoginModal(true); return }
      if (!response.ok || typeof data.liked !== 'boolean' || !Number.isSafeInteger(data.like_count) || data.like_count < 0) throw new Error()
      setLiked(data.liked); setCount(data.like_count)
      window.dispatchEvent(new CustomEvent('cares:post-like-changed', { detail: { postId, facilityId: data.facility_id, liked: data.liked, likeCount: data.like_count } }))
      router.refresh()
    } catch { setError('結果を確認できませんでした。もう一度押して確認できます。') }
    finally { busy.current = false; setLoading(false) }
  }
  return <div>
    <button onClick={toggle} disabled={loading || !ready} aria-busy={loading} aria-label={liked ? '投稿のいいねを取り消す' : '投稿にいいね'} aria-pressed={liked}
      className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition disabled:opacity-50 ${liked ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
      <Heart aria-hidden="true" className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} /><span aria-live="polite" className="tabular-nums">{count.toLocaleString('ja-JP')}</span><span>{loading ? '確認中…' : 'いいね'}</span>
    </button>
    <p className="mt-2 text-xs text-slate-500">このいいねは、事業所の応援ハートにも加わります。</p>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}{!ready && <button onClick={() => setRetry(value => value + 1)} className="ml-2 min-h-11 underline">再読み込み</button>}</p>}
    <LoginPromptModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} variant="default" />
  </div>
}
