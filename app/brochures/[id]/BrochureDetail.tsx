'use client'
import { useState } from 'react'
import type { Brochure } from '@/lib/brochures'
import BrochureCard from '@/components/BrochureCard'
import { useEffect } from 'react'

export default function BrochureDetail({ initial }: { initial: Brochure }) {
  const [item, setItem] = useState(initial), [error, setError] = useState(''), [revision, setRevision] = useState(0), [unavailable, setUnavailable] = useState(false)
  useEffect(() => {
    const controller = new AbortController(); let active = true
    fetch(`/api/brochures/${initial.id}`, { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!active) return
      if (response.status === 404) { setUnavailable(true); return }
      if (!response.ok) throw new Error('最新の情報を読み込めませんでした。')
      const body = await response.json()
      if (active) { setItem(body); setError('') }
    }).catch(() => { if (active) setError('最新の情報を読み込めませんでした。') })
    return () => { active = false; controller.abort() }
  }, [initial.id, revision])
  if (unavailable) return <p className="rounded-2xl bg-white p-6 text-sm text-slate-600">この資料は公開を終了しました。</p>
  return <>{error && <p role="alert" className="mb-3 text-sm text-slate-600">{error}<button onClick={() => setRevision(value => value + 1)} className="ml-2 min-h-11 underline">再読み込み</button></p>}<BrochureCard item={item} expanded onChange={() => setRevision(value => value + 1)} /></>
}
