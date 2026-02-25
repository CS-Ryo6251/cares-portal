'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { createAuthClient } from '@/lib/supabase-auth'
import LoginPromptModal from './LoginPromptModal'

interface LikeButtonProps {
  postId: string
  initialLikeCount: number
}

export default function LikeButton({ postId, initialLikeCount }: LikeButtonProps) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [loading, setLoading] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createAuthClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const res = await fetch(`/api/likes/status?postId=${postId}`)
        if (res.ok) {
          const data = await res.json()
          setLiked(data.liked)
        }
      }
    }
    checkAuth()
  }, [postId])

  const handleToggle = async () => {
    if (!userId) {
      setShowLoginModal(true)
      return
    }
    if (loading) return

    setLoading(true)
    const method = liked ? 'DELETE' : 'POST'

    try {
      const res = await fetch('/api/likes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })

      if (res.ok) {
        setLiked(!liked)
        setLikeCount(prev => liked ? Math.max(prev - 1, 0) : prev + 1)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
          liked
            ? 'bg-red-50 text-red-600 hover:bg-red-100'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
        {likeCount > 0 && <span className="tabular-nums">{likeCount}</span>}
      </button>
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        variant="default"
      />
    </>
  )
}
