import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase-server-auth'
import NotificationsClient from './NotificationsClient'

export const metadata = {
  title: '通知',
}

export default async function NotificationsPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login?redirect=/notifications')
  }

  return <NotificationsClient />
}
