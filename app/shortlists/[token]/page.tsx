import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SHARE_TOKEN } from '@/lib/personal-lists'
import SharedListClient from './SharedListClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: '紹介された事業所', description: '共有された事業所の候補をご覧いただけます。', robots: { index: false, follow: false, noarchive: true }, referrer: 'no-referrer', openGraph: { title: '紹介された事業所', description: '事業所の候補リスト', images: [] }, twitter: { title: '紹介された事業所', description: '事業所の候補リスト', images: [] } }
export default async function SharedListPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!SHARE_TOKEN.test(token)) notFound()
  return <SharedListClient token={token} />
}
