'use client'

import { useState, useEffect, useRef } from 'react'
import { createAuthClient } from '@/lib/supabase-auth'
import { Bell, ClipboardList, Settings, LogOut, ChevronDown, User } from 'lucide-react'

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
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createAuthClient()

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({ id: user.id, email: user.email })

        const { data: profileData, error: profileError } = await supabase
          .from('cares_user_profiles')
          .select('display_name, profession')
          .eq('user_id', user.id)
          .maybeSingle()

        if (profileData && !profileError) {
          setProfile(profileData)
        }

        // 未読通知数
        const { count } = await supabase
          .from('cares_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)

        setUnreadCount(count || 0)
      }
      setLoading(false)
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

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
    return <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <a
          href="/login"
          className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
        >
          ログイン
        </a>
        <a
          href="/signup"
          className="px-3 py-1.5 rounded-xl bg-gray-800 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          新規登録
        </a>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Notification bell */}
      <a
        href="/notifications"
        className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
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

            <a
              href="/my-actions"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              <ClipboardList className="w-4 h-4" />
              Myアクション
            </a>

            <a
              href="/account"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              <Settings className="w-4 h-4" />
              アカウント設定
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
