'use client'

import { useState } from 'react'
import { Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error)
        return
      }

      setSent(true)
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
              <Mail className="w-5 h-5 text-gray-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">パスワードをリセット</h1>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">メールを送信しました</h2>
              <p className="text-sm text-gray-500 mb-6">
                <strong>{email}</strong> 宛にパスワードリセット用のリンクを送信しました。
                メール内のリンクをクリックして、新しいパスワードを設定してください。
              </p>
              <p className="text-xs text-gray-400 mb-6">
                メールが届かない場合は、迷惑メールフォルダをご確認ください。
              </p>
              <a
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                ログインに戻る
              </a>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-6">
                アカウントに登録されたメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
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
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gray-800 text-white rounded-xl text-base font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {loading ? '送信中...' : 'リセットリンクを送信'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  ログインに戻る
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
