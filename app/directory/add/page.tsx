'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { serviceTypes, prefectures } from '@/lib/constants'

type Duplicate = {
  id: string
  facility_name: string
  address: string | null
  service_type: string | null
  prefecture: string | null
  city: string | null
}

export default function DirectoryAddPage() {
  const [form, setForm] = useState({
    facility_name: '',
    service_type: '',
    prefecture: '',
    city: '',
    address: '',
    phone: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [duplicates, setDuplicates] = useState<Duplicate[] | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(force = false) {
    if (!form.facility_name.trim() || !form.service_type || !form.prefecture) return
    setSubmitting(true)
    setError('')
    setDuplicates(null)

    try {
      const url = force ? '/api/directory/add?force=true' : '/api/directory/add'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_name: form.facility_name.trim(),
          service_type: form.service_type,
          prefecture: form.prefecture,
          city: form.city.trim() || undefined,
          address: form.address.trim() || undefined,
          phone: form.phone.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '登録に失敗しました')
        return
      }

      // Duplicates found
      if (data.duplicates) {
        setDuplicates(data.duplicates)
        return
      }

      // Success
      setSuccess(data.id)
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">登録が完了しました</h2>
          <p className="text-base text-gray-500 mb-6">
            コミュニティ投稿として掲載されます
          </p>
          <div className="flex flex-col gap-3 items-center">
            <Link
              href={`/directory/${success}`}
              className="inline-flex items-center px-6 py-3 bg-cares-600 text-white rounded-xl text-base font-semibold hover:bg-cares-700 transition-colors"
            >
              事業所ページを見る
            </Link>
            <Link
              href="/directory"
              className="text-sm text-gray-500 hover:text-cares-600 transition-colors"
            >
              検索に戻る
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Back link */}
      <Link
        href="/directory"
        className="inline-flex items-center gap-1.5 text-base text-gray-500 hover:text-cares-600 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        戻る
      </Link>

      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
        事業所情報を追加する
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        掲載されていない事業所を登録できます。
      </p>

      {/* Notice */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 leading-relaxed">
          コミュニティ投稿として掲載されます。正式な情報は事業所オーナーが登録できます。
        </p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            施設名 *
          </label>
          <input
            type="text"
            value={form.facility_name}
            onChange={(e) => updateField('facility_name', e.target.value)}
            placeholder="例: ○○デイサービス"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            サービス種別 *
          </label>
          <select
            value={form.service_type}
            onChange={(e) => updateField('service_type', e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none appearance-none cursor-pointer bg-white"
          >
            <option value="">選択してください</option>
            {serviceTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            都道府県 *
          </label>
          <select
            value={form.prefecture}
            onChange={(e) => updateField('prefecture', e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none appearance-none cursor-pointer bg-white"
          >
            <option value="">選択してください</option>
            {prefectures.map((pref) => (
              <option key={pref} value={pref}>{pref}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1.5">
            市区町村
          </label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => updateField('city', e.target.value)}
            placeholder="例: 港区"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1.5">
            住所
          </label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="例: 東京都港区〇〇1-2-3"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1.5">
            電話番号
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="例: 03-1234-5678"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-cares-500 focus:border-cares-500 outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-4">{error}</p>
      )}

      {/* Duplicates */}
      {duplicates && (
        <div className="mt-6">
          <p className="text-base font-medium text-gray-900 mb-3">
            類似する事業所が見つかりました:
          </p>
          <div className="space-y-3 mb-4">
            {duplicates.map((dup) => (
              <Link
                key={dup.id}
                href={`/directory/${dup.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-cares-300 transition-colors"
              >
                <p className="text-base font-bold text-gray-900">{dup.facility_name}</p>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  {dup.service_type && <span>{dup.service_type}</span>}
                  {dup.address && <span>{dup.address}</span>}
                </div>
              </Link>
            ))}
          </div>
          <button
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            {submitting ? '登録中...' : '該当なし。新規登録する'}
          </button>
        </div>
      )}

      {/* Submit */}
      {!duplicates && (
        <button
          onClick={() => handleSubmit()}
          disabled={!form.facility_name.trim() || !form.service_type || !form.prefecture || submitting}
          className="w-full mt-6 px-4 py-3 bg-cares-600 text-white rounded-xl text-base font-semibold hover:bg-cares-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? '確認中...' : '登録する'}
        </button>
      )}
    </div>
  )
}
