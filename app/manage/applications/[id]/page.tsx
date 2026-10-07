import type { Metadata } from 'next'
import ApplicationDetail from './ApplicationDetail'
export const metadata: Metadata = { title: '申込みの確認 — Cares', robots: { index: false, follow: false }, referrer: 'no-referrer' }
export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) { return <ApplicationDetail id={(await params).id} /> }
