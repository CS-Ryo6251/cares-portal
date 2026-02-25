'use client'

import { useState, useEffect } from 'react'
import { Settings, LogOut, Trash2, Loader2, Save, User } from 'lucide-react'

const PROFESSIONS = [
  { value: 'care_manager', label: 'ケアマネジャー' },
  { value: 'msw', label: 'MSW（医療ソーシャルワーカー）' },
  { value: 'care_worker', label: '介護士' },
  { value: 'nurse', label: '看護師' },
  { value: 'therapist', label: 'PT・OT・ST' },
  { value: 'family', label: 'ご家族' },
  { value: 'other', label: 'その他' },
]

interface Profile {
  display_name: string
  profession: string
  notify_vacancy_change: boolean
  notify_comment_reply: boolean
  email_notifications: boolean
}

export default function AccountClient() {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [profession, setProfession] = useState('')
  const [notifyVacancy, setNotifyVacancy] = useState(true)
  const [notifyComment, setNotifyComment] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/account')
        if (!res.ok) throw new Error()
        const data = await res.json()

        setEmail(data.email || '')
        setDisplayName(data.profile?.display_name || '')
        setProfession(data.profile?.profession || '')
        setNotifyVacancy(data.profile?.notify_vacancy_change ?? true)
        setNotifyComment(data.profile?.notify_comment_reply ?? true)
        setEmailNotifications(data.profile?.email_notifications ?? true)
      } catch {
        setError('プロフィールの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    setSaved(false)

    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          profession,
          notify_vacancy_change: notifyVacancy,
          notify_comment_reply: notifyComment,
          email_notifications: emailNotifications,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '更新に失敗しました')
        return
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '削除に失敗しました')
        setDeleting(false)
        return
      }
      window.location.href = '/'
    } catch {
      setError('通信エラーが発生しました')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-180px)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-gray-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">アカウント設定</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-600">
          設定を保存しました
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">プロフィール</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-400">メールアドレスは変更できません</p>
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                表示名
              </label>
              <input
                id="displayName"
                type="text"
                maxLength={50}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
                placeholder="例: 田中ケアマネ"
              />
            </div>

            <div>
              <label htmlFor="profession" className="block text-sm font-medium text-gray-700 mb-1">
                職種
              </label>
              <select
                id="profession"
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
          </div>
        </div>

        {/* Notification settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">通知設定</h2>
          </div>

          <div className="space-y-4">
            <ToggleRow
              label="空き情報変更通知"
              description="お気に入り施設の空き状況が変わったとき"
              checked={notifyVacancy}
              onChange={setNotifyVacancy}
            />
            <ToggleRow
              label="コメント返信通知"
              description="あなたのコメントに返信があったとき"
              checked={notifyComment}
              onChange={setNotifyComment}
            />
            <ToggleRow
              label="メール通知"
              description="通知をメールでも受け取る"
              checked={emailNotifications}
              onChange={setEmailNotifications}
            />
          </div>
        </div>

        {/* Save button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? '保存中...' : '設定を保存'}
        </button>
      </form>

      {/* Account actions */}
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">アカウント操作</h2>

        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            ログアウト
          </button>

          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              アカウントを削除
            </button>
          ) : (
            <div className="border border-red-200 rounded-xl p-4 bg-red-50">
              <p className="text-sm text-red-600 mb-3">
                本当にアカウントを削除しますか？この操作は取り消せません。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleting ? '削除中...' : '削除する'}
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-white transition-colors disabled:opacity-50"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-gray-800' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
