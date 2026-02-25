import type { Metadata } from 'next'
import FavoritesClient from './FavoritesClient'

export const metadata: Metadata = {
  title: 'お気に入り',
  description: 'お気に入りに登録した施設の一覧です。施設を比較することもできます。',
}

export default function FavoritesPage() {
  return <FavoritesClient />
}
