import { redirect } from 'next/navigation'
import { createAuthServerClient } from '@/lib/supabase-server-auth'
import MyFacilitiesClient from './MyFacilitiesClient'

export const metadata = { title: '自分の事業所を見せる・共有する' }

export default async function MyFacilitiesPage() {
  const auth = await createAuthServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login?redirect=/my-facilities')
  return <MyFacilitiesClient />
}
