import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { brochureList } from '@/lib/brochures-server'
import { validId } from '@/lib/intake'
import BrochureDetail from './BrochureDetail'

export const dynamic = 'force-dynamic'
async function read(id: string) {
  if (!validId(id)) return null
  return (await brochureList({ id })).items[0] || null
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const item = await read((await params).id)
  if (!item) return { title: '資料が見つかりません', robots: { index: false } }
  return { title: `${item.title}｜${item.facilityName}`, description: `${item.facilityName}のパンフレット。Caresのユーザーが共有した資料です。`, alternates: { canonical: `/brochures/${item.id}` }, openGraph: { title: `${item.title}｜${item.facilityName}`, description: '地域のみんなが持ち寄った事業所の資料です。', url: `/brochures/${item.id}` } }
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const item = await read((await params).id)
  if (!item) notFound()
  return <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12"><Link href={`/directory/${item.listingId}#brochures`} className="inline-flex min-h-11 items-center text-sm text-slate-500">← 事業所ページへ</Link><h1 className="mb-5 mt-4 text-xl font-bold text-slate-900">共有されたパンフレット</h1><BrochureDetail initial={item} /><p className="mt-5 text-xs leading-6 text-slate-500">ユーザーが共有した資料です。最新の内容は事業所へご確認ください。</p></main>
}
