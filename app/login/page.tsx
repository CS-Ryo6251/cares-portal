'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { LogIn } from 'lucide-react'
import { safeAuthRedirect } from '@/lib/auth-redirect'
import ProviderManagementLink from '@/components/ProviderManagementLink'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-180px)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const redirect = safeAuthRedirect(searchParams.get('redirect'))
  const errorParam = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(errorParam === 'auth' ? '認証に失敗しました。もう一度お試しください' : '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
        signal: controller.signal,
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'ログインできませんでした。もう一度お試しください')
        return
      }

      // The API sets session cookies, but does not emit a browser auth event.
      // Reload the document so the shared header and Supabase client read them.
      window.location.replace(redirect)
    } catch {
      setError(controller.signal.aborted
        ? 'ログインの確認に時間がかかっています。画面を再読み込みするか、少し待ってもう一度お試しください'
        : '通信エラーが発生しました。接続を確認してもう一度お試しください')
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <LogIn className="w-5 h-5 text-gray-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Caresの利用者ログイン</h1>
          </div>

          <div className="mb-5 rounded-2xl border border-cares-100 bg-cares-50/70 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">口コミ・お気に入り・個人メモを使う</p>
            <p className="mt-1 leading-relaxed">
              CareSpace OSに登録済みの方は、同じメールアドレス・パスワードでログインできます。再登録は不要です。
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">事業所の検索やハートでの応援は、ログインせずに利用できます。</p>
          </div>

          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
                placeholder="8文字以上"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gray-800 text-white rounded-xl text-base font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a href="/forgot-password" className="text-sm text-gray-400 hover:text-gray-600 hover:underline">
              パスワードをお忘れですか？
            </a>
          </div>

          <div className="mt-4 text-center text-sm text-gray-500">
            アカウントをお持ちでない方{' '}
            <a href={`/signup${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="text-gray-700 font-medium hover:underline">
              新規登録はこちら
            </a>
          </div>

          <ProviderManagementLink />
        </div>
      </div>
    </div>
  )
}
