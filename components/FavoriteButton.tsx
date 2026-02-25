'use client'

import { useState, useEffect } from 'react'
import { Bookmark } from 'lucide-react'
import { createAuthClient } from '@/lib/supabase-auth'
import LoginPromptModal from './LoginPromptModal'

interface FavoriteButtonProps {
  listingId: string
  variant?: 'icon' | 'button'
}

export default function FavoriteButton({ listingId, variant = 'button' }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createAuthClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const res = await fetch(`/api/favorites?listingId=${listingId}`)
        if (res.ok) {
          const data = await res.json()
          setFavorited(data.favorites?.some((f: any) => f.listing_id === listingId) || false)
        }
      }
    }
    checkAuth()
  }, [listingId])

  const handleToggle = async () => {
    if (!userId) {
      setShowLoginModal(true)
      return
    }
    if (loading) return

    setLoading(true)
    const method = favorited ? 'DELETE' : 'POST'

    try {
      const res = await fetch('/api/favorites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      })

      if (res.ok) {
        setFavorited(!favorited)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`inline-flex items-center justify-center w-11 h-11 rounded-xl transition-colors ${
            favorited
              ? 'bg-amber-50 text-amber-500 hover:bg-amber-100'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
          }`}
          title={favorited ? 'お気に入り解除' : 'お気に入りに追加'}
        >
          <Bookmark className={`w-5 h-5 ${favorited ? 'fill-current' : ''}`} />
        </button>
        <LoginPromptModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          variant="favorite"
        />
      </>
    )
  }

  return (
    <>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          favorited
            ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Bookmark className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
        {favorited ? 'お気に入り済み' : 'お気に入り'}
      </button>
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        variant="favorite"
      />
    </>
  )
}
