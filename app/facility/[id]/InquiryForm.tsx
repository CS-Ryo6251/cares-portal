'use client'

import { useState } from 'react'
import { Send, CheckCircle } from 'lucide-react'

type Props = {
  facilityId: string
  facilityName: string
}

export default function InquiryForm({ facilityId, facilityName }: Props) {
  const [form, setForm] = useState({
    inquirer_name: '',
    inquirer_phone: '',
    inquirer_email: '',
    inquirer_type: '',
    message: '',
  })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSending(true)

    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_id: facilityId,
          ...form,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '送信に失敗しました')
      }

      setSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-3" />
        <p className="font-medium text-green-800 mb-1">問い合わせを送信しました</p>
        <p className="text-sm text-green-600">
          {facilityName}から折り返しご連絡いたします。
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          お名前 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={form.inquirer_name}
          onChange={(e) => setForm({ ...form, inquirer_name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
          placeholder="山田 太郎"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
          <input
            type="tel"
            value={form.inquirer_phone}
            onChange={(e) => setForm({ ...form, inquirer_phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
            placeholder="090-1234-5678"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
          <input
            type="email"
            value={form.inquirer_email}
            onChange={(e) => setForm({ ...form, inquirer_email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
            placeholder="example@email.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ご関係 <span className="text-red-500">*</span>
        </label>
        <select
          required
          value={form.inquirer_type}
          onChange={(e) => setForm({ ...form, inquirer_type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none bg-white"
        >
          <option value="">選択してください</option>
          <option value="family">ご家族</option>
          <option value="care_manager">ケアマネジャー</option>
          <option value="msw">MSW（医療ソーシャルワーカー）</option>
          <option value="self">ご本人</option>
          <option value="other">その他</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          お問い合わせ内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none resize-none"
          placeholder="空き状況の確認、見学のご希望など、お気軽にお問い合わせください"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cares-600 text-white rounded-lg hover:bg-cares-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" />
        {sending ? '送信中...' : '問い合わせを送信'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        送信いただいた内容は施設に直接届きます
      </p>
    </form>
  )
}
