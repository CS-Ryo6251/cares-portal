'use client'

import { useRef, useState } from 'react'
import { listSnapshot, type ListFacility, type PersonalList } from '@/lib/personal-lists'
import { listRequest } from '@/lib/personal-lists-client'
import SharedListContent from '@/components/SharedListContent'
import ListShareTools from '@/components/ListShareTools'

export default function PersonalListSharing({ list, facilities, disabled, onBusy, onUpdate }: { list: PersonalList; facilities: Record<string, ListFacility>; disabled: boolean; onBusy: (value: boolean) => void; onUpdate: (list: PersonalList) => void }) {
  const [title, setTitle] = useState(list.share_snapshot?.title || 'おすすめの事業所'), [intro, setIntro] = useState(list.share_snapshot?.intro || '')
  const [preview, setPreview] = useState<number | null>(null), [error, setError] = useState(''), [message, setMessage] = useState('')
  const busy = useRef(false)
  async function change(action: 'share' | 'unshare') {
    if (disabled || busy.current) return
    if (action === 'unshare' && !window.confirm('共有を停止しますか？現在のURL・QRコードは使えなくなります。')) return
    busy.current = true; onBusy(true); setError(''); setMessage('')
    try {
      const result = await listRequest<{ list: PersonalList }>(`/api/my-lists/${list.id}`, { action, version: list.version, title, intro }, 'PATCH')
      onUpdate(result.list); setPreview(null); setMessage(action === 'share' ? '共有する内容を保存しました。' : '共有を停止しました。')
    } catch (e) { setError((e as Error).message) }
    finally { busy.current = false; onBusy(false) }
  }
  function check() {
    setError('')
    try { listSnapshot(list, title, intro); setPreview(list.version) } catch (e) { setError((e as Error).message) }
  }
  return <section aria-label="家族への共有設定" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
    <h3 className="font-bold text-slate-900">家族に候補を共有する</h3><p className="text-xs leading-5 text-slate-500">自分用のリスト名・メモは表示されません。共有用の見出しと紹介コメントを確認してください。</p>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}{message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {list.share_token && <><ListShareTools key={list.share_token} token={list.share_token} /><p className="text-xs text-slate-500">{list.shared_version !== list.version ? '保存した変更は、まだ共有ページに反映されていません。' : '共有中の内容は保存済みです。'} 「共有内容を確認」から更新できます。</p></>}
    <fieldset disabled={disabled} className="space-y-3"><label className="block text-xs font-semibold">共有用の見出し<input maxLength={80} value={title} onChange={e => { setTitle(e.target.value); setPreview(null) }} className="mt-1 min-h-11 w-full rounded-xl border px-3 text-sm font-normal" /></label><label className="block text-xs font-semibold">共有用の説明<textarea maxLength={500} rows={2} value={intro} onChange={e => { setIntro(e.target.value); setPreview(null) }} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal leading-6" /></label>
      <button disabled={!list.entries.length} onClick={check} className="min-h-11 rounded-full border border-slate-300 px-5 text-sm font-semibold disabled:opacity-40">共有内容を確認</button>
      {preview === list.version && list.entries.length > 0 && <div className="space-y-4 rounded-2xl border border-slate-200 bg-stone-50 p-4"><p className="text-xs font-bold text-slate-500">家族に表示される内容</p><SharedListContent data={{ ...listSnapshot(list, title, intro), facilities }} /><p className="text-xs text-slate-500">発行するリンクを知っている方が閲覧できます。</p><button onClick={() => void change('share')} className="min-h-11 rounded-full bg-slate-800 px-5 text-sm font-bold text-white">{list.share_token ? 'この内容で共有ページを更新' : 'この内容で共有リンクを発行'}</button></div>}
      {list.share_token && <button onClick={() => void change('unshare')} className="block min-h-11 text-xs text-slate-500 underline">共有を停止する</button>}
    </fieldset>
  </section>
}
