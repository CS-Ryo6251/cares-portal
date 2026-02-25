'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Lock, CheckCircle } from 'lucide-react'
import { createAuthClient } from '@/lib/supabase-auth'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Supabaseがリダイレクト時にURLフラグメントからセッションを自動復元する
    const supabase = createAuthClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // コード付きリダイレクトの場合（PKCE flow）
    const code = searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError('リセットリンクが無効または期限切れです。もう一度お試しください。')
        } else {
          setSessionReady(true)
        }
      })
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    setLoading(true)

    try {
      const supabase = createAuthClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message === 'New password should be different from the old password.'
          ? '新しいパスワードは現在のパスワードと異なるものにしてください'
          : 'パスワードの更新に失敗しました。もう一度お試しください。')
        return
      }

      setSuccess(true)
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Lock className="w-5 h-5 text-gray-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">新しいパスワードを設定</h1>
          </div>

          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">パスワードを更新しました</h2>
              <p className="text-sm text-gray-500 mb-6">
                新しいパスワードでログインできます。
              </p>
              <a
                href="/login"
                className="inline-block px-6 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
              >
                ログインへ
              </a>
            </div>
          ) : (
            <>
              {!sessionReady && !error && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {error}
                  {!sessionReady && (
                    <div className="mt-2">
                      <a href="/forgot-password" className="text-red-700 font-medium hover:underline">
                        パスワードリセットをやり直す
                      </a>
                    </div>
                  )}
                </div>
              )}

              {sessionReady && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      新しいパスワード
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
                      placeholder="8文字以上"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      パスワード確認
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
                      placeholder="もう一度入力"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gray-800 text-white rounded-xl text-base font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? '更新中...' : 'パスワードを更新'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-180px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
