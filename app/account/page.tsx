import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase-server-auth'
import AccountClient from './AccountClient'

export const metadata = {
  title: 'アカウント設定',
}

export default async function AccountPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login?redirect=/account')
  }

  return <AccountClient />
}
