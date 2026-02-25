import type { Metadata } from 'next'
import MyActionsClient from './MyActionsClient'

export const metadata: Metadata = {
  title: 'Myアクション',
  description: 'お気に入り・評価・メモを管理できます。',
}

export default function MyActionsPage() {
  return <MyActionsClient />
}
