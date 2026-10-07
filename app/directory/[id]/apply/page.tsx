import Link from 'next/link'
import type { Metadata } from 'next'
import { getIntakeTarget } from '@/lib/intake-server'
import ApplicationForm from './ApplicationForm'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: '見学・体験・利用のお申込み — Cares', robots: { index: false, follow: false }, referrer: 'no-referrer' }
export default async function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const target = await getIntakeTarget(id)
  return <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12"><Link href={`/directory/${id}`} className="text-sm font-semibold text-slate-500">← 事業所のページへ</Link>
    {target?.enabled ? <ApplicationForm target={target} /> : <div className="mt-6 rounded-3xl bg-white p-8"><h1 className="text-xl font-bold">フォーム受付は現在ご利用いただけません</h1><p className="mt-4 text-sm leading-7 text-slate-600">事業所のページにある電話などからお問い合わせください。</p></div>}
  </main>
}
