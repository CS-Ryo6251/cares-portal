import type { Metadata } from 'next'
import IntakeInbox from './IntakeInbox'
export const metadata: Metadata = { title: '空き情報・申込み受付 — Cares', robots: { index: false, follow: false }, referrer: 'no-referrer' }
export default function ManagePage() { return <IntakeInbox /> }
