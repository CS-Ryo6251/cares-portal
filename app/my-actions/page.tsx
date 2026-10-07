import type { Metadata } from 'next'
import MyActionsClient from './MyActionsClient'

export const metadata: Metadata = {
  title: 'Myアクション',
  description: '届けた応援のグラフと履歴、お気に入り、メモを振り返れます。',
  robots: { index: false, follow: false },
}

export default function MyActionsPage() {
  return <MyActionsClient />
}
