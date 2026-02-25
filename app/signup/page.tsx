'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { UserPlus, Mail, ArrowLeft } from 'lucide-react'

const PROFESSIONS = [
  { value: 'care_manager', label: 'ケアマネジャー' },
  { value: 'msw', label: 'MSW（医療ソーシャルワーカー）' },
  { value: 'care_worker', label: '介護士' },
  { value: 'nurse', label: '看護師' },
  { value: 'therapist', label: 'PT・OT・ST' },
  { value: 'family', label: 'ご家族' },
  { value: 'other', label: 'その他' },
]

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-180px)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /></div>}>
      <SignupForm />
    </Suspense>
  )
}

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [profession, setProfession] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !displayName || !profession) {
      setError('すべての項目を入力してください')
      return
    }
    setStep(2)
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }
    if (password !== passwordConfirm) {
      setError('パスワードが一致しません')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName, profession }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      if (data.needsEmailConfirmation) {
        setStep(3)
      } else {
        router.push(redirect)
        router.refresh()
      }
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s === step ? 'bg-gray-800 text-white' : s < step ? 'bg-gray-400 text-white' : 'bg-gray-200 text-gray-400'
              }`}>
                {s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-gray-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-8 mb-8 text-xs text-gray-400">
          <span className={step === 1 ? 'text-gray-700 font-medium' : ''}>基本情報</span>
          <span className={step === 2 ? 'text-gray-700 font-medium' : ''}>パスワード</span>
          <span className={step === 3 ? 'text-gray-700 font-medium' : ''}>完了</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Step 1: Basic info */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">アカウント作成</h1>
                  <p className="text-xs text-gray-400">1/3 基本情報</p>
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス <span className="text-red-400">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                  表示名 <span className="text-red-400">*</span>
                </label>
                <input
                  id="displayName"
                  type="text"
                  required
                  maxLength={50}
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
                  placeholder="例: 田中ケアマネ"
                />
                <p className="mt-1 text-xs text-gray-400">メモやコメント投稿時に表示されます</p>
              </div>

              <div>
                <label htmlFor="profession" className="block text-sm font-medium text-gray-700 mb-1">
                  職種 <span className="text-red-400">*</span>
                </label>
                <select
                  id="profession"
                  required
                  value={profession}
                  onChange={e => setProfession(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent bg-white"
                >
                  <option value="">選択してください</option>
                  {PROFESSIONS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                次へ
              </button>

              <div className="text-center text-sm text-gray-500">
                すでにアカウントをお持ちの方{' '}
                <a href={`/login${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="text-gray-700 font-medium hover:underline">
                  ログインはこちら
                </a>
              </div>
            </form>
          )}

          {/* Step 2: Password */}
          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">パスワードを設定</h1>
                  <p className="text-xs text-gray-400">2/3 パスワード</p>
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード <span className="text-red-400">*</span>
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
                  placeholder="8文字以上"
                />
              </div>

              <div>
                <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード確認 <span className="text-red-400">*</span>
                </label>
                <input
                  id="passwordConfirm"
                  type="password"
                  required
                  minLength={8}
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
                  placeholder="もう一度入力"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {loading ? '登録中...' : 'アカウントを作成'}
              </button>

              <button
                type="button"
                onClick={() => { setStep(1); setError('') }}
                className="w-full flex items-center justify-center gap-1 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="w-4 h-4" /> 戻る
              </button>
            </form>
          )}

          {/* Step 3: Email confirmation */}
          {step === 3 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-gray-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">確認メールを送りました</h1>
              <p className="text-sm text-gray-500 mb-1">
                <span className="font-medium text-gray-700">{email}</span> に
              </p>
              <p className="text-sm text-gray-500 mb-6">
                確認用のリンクを送信しました。メールをご確認ください。
              </p>

              <a
                href={`/login${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
                className="text-sm text-gray-700 font-medium hover:underline"
              >
                ログイン画面に戻る
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
