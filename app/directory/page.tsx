import { permanentRedirect } from 'next/navigation'
import { unifiedSearchUrl } from '@/lib/search-navigation'

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  permanentRedirect(unifiedSearchUrl(await searchParams))
}
