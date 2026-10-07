'use client'

import { useState, useEffect, useRef } from 'react'
import { createAuthClient } from '@/lib/supabase-auth'
import { Bell, Building2, ClipboardList, Settings, LogOut, ChevronDown, User, PencilLine, Heart } from 'lucide-react'

import { CARESPACE_MANAGEMENT_URL, facilityManagementUrl } from '@/lib/cares-navigation'

const PROFESSION_LABELS: Record<string, string> = {
  care_manager: 'ケアマネ',
  msw: 'MSW',
  care_worker: '介護士',
  nurse: '看護師',
  therapist: 'PT/OT/ST',
  family: 'ご家族',
  other: 'その他',
}


interface UserProfile {
  display_name: string
  profession: string
}

export default function AuthHeader() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [hasMyFacilities, setHasMyFacilities] = useState(false)
  const [postingUrl, setPostingUrl] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(false)
  const [retry, setRetry] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createAuthClient()
    let active = true
    let revision = 0
    setLoading(true)
    setAuthError(false)
    const timeout = setTimeout(() => {
      if (active) {
        setLoading(false)
        setAuthError(true)
      }
    }, 15_000)

    async function loadUser() {
      const currentRevision = revision
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (!active || revision !== currentRevision) return
        if (error && error.name !== 'AuthSessionMissingError') throw error
        setUser(user ? { id: user.id, email: user.email } : null)
        setAuthError(false)
      } catch {
        if (active && revision === currentRevision) setAuthError(true)
      } finally {
        if (active && revision === currentRevision) {
          clearTimeout(timeout)
          setLoading(false)
        }
      }
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
          revision += 1
          clearTimeout(timeout)
          const nextUser = session?.user
          setUser(nextUser ? { id: nextUser.id, email: nextUser.email } : null)
          setAuthError(false)
          setLoading(false)
          setMenuOpen(false)
        }
      }
    )

    return () => {
      active = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [retry])

  // Profile/notification failures must not hide a successfully signed-in user.
  const userId = user?.id
  useEffect(() => {
    setProfile(null)
    setUnreadCount(0)
    if (!userId) return
    const supabase = createAuthClient()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    let active = true
    async function loadDetails() {
      try {
        const [profileResult, notificationResult] = await Promise.all([
          supabase.from('cares_user_profiles').select('display_name, profession').eq('user_id', userId!).abortSignal(controller.signal).maybeSingle(),
          supabase.from('cares_notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId!).eq('is_read', false).abortSignal(controller.signal),
        ])
        if (!active) return
        if (!profileResult.error) setProfile(profileResult.data)
        if (!notificationResult.error) setUnreadCount(notificationResult.count || 0)
      } catch {
        // The account menu remains usable with the verified user's email.
      } finally {
        clearTimeout(timeout)
      }
    }
    void loadDetails()
    return () => { active = false; clearTimeout(timeout); controller.abort() }
  }, [userId])

  useEffect(() => {
    setHasMyFacilities(false)
    setPostingUrl(null)
    if (!userId) return
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    let active = true
    fetch('/api/my-facilities', { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) return
        const data = await response.json()
        if (active) {
          const facilities = Array.isArray(data.facilities) ? data.facilities.filter((f: { id?: unknown }) => typeof f.id === 'string') : []
          setHasMyFacilities(facilities.length > 0)
          setPostingUrl(facilities.length === 1 ? facilityManagementUrl(facilities[0].id, 'posts') : facilities.length > 1 ? `${CARESPACE_MANAGEMENT_URL}?cares_section=posts` : null)
        }
      })
      .catch(() => { /* Shared account login remains usable if facility lookup fails. */ })
      .finally(() => clearTimeout(timeout))
    return () => { active = false; clearTimeout(timeout); controller.abort() }
  }, [userId])

  // 外部クリックでメニュー閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  if (loading) {
    return <div role="status" aria-label="ログイン状態を確認中" className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
  }

  if (authError) {
    return <button onClick={() => setRetry(value => value + 1)} className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-600">ログイン状態を再確認</button>
  }

  if (!user) {
    return (
      <div className="flex items-center gap-1.5 sm:gap-2">
        <a
          href="/login"
          className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
        >
          ログイン
        </a>
        <a
          href="/signup"
          className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gray-800 text-xs sm:text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          <span className="sm:hidden">登録</span>
          <span className="hidden sm:inline">新規登録</span>
        </a>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {!hasMyFacilities && <a href="/my-actions" aria-label="応援の記録" title="応援の記録" className="inline-flex h-11 w-9 items-center justify-center text-rose-600 hover:text-rose-800"><Heart className="h-5 w-5" /></a>}
      {postingUrl && <a href={postingUrl} aria-label="投稿する" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-700 sm:px-4 sm:text-sm"><PencilLine aria-hidden="true" className="h-4 w-4" /><span className="sm:hidden">投稿</span><span className="hidden sm:inline">投稿する</span></a>}
      {hasMyFacilities && <a href="/my-facilities" className="max-[359px]:hidden shrink-0 rounded-xl bg-cares-50 px-2 py-2 text-xs font-semibold text-cares-700 sm:px-3 sm:text-sm">自分の事業所</a>}
      {/* Notification bell */}
      <a
        href="/notifications"
        aria-label="通知"
        className={`relative p-2 text-gray-400 hover:text-gray-600 transition-colors ${hasMyFacilities ? 'hidden sm:block' : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </a>

      {/* User menu */}
      <div className="relative" ref={menuRef}>
        <button
          aria-label="アカウントメニュー"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-xl hover:bg-gray-50 transition-colors ${menuOpen ? 'bg-gray-50' : ''}`}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500">
            <User className="w-4 h-4" />
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">
                {profile?.display_name || user?.email || 'ユーザー'}
              </p>
              <p className="text-xs text-gray-400">
                {profile?.profession
                  ? (PROFESSION_LABELS[profile.profession] || profile.profession)
                  : (profile ? '' : 'プロフィール未設定')}
              </p>
            </div>

            {hasMyFacilities && <a href="/my-facilities" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-cares-700 hover:bg-cares-50"><Building2 className="w-4 h-4" />自分の事業所</a>}
            <a href="/manage" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-cares-700 hover:bg-cares-50"><ClipboardList className="w-4 h-4" />空き情報・申込み受付</a>
            <a href="/notifications" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"><Bell className="w-4 h-4" />通知{unreadCount > 0 ? `（${unreadCount}件）` : ''}</a>

            <a
              href="/my-actions"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              <ClipboardList className="w-4 h-4" />
              Myアクション・応援の記録
            </a>

            <a
              href="/account"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              <Settings className="w-4 h-4" />
                Caresの利用者設定
            </a>

            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                ログアウト
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
