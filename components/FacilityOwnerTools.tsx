'use client'
import { useEffect, useState } from 'react'
import { Camera, PencilLine } from 'lucide-react'
import { facilityManagementUrl } from '@/lib/cares-navigation'

export default function FacilityOwnerTools({ facilityId }: { facilityId: string }) {
  const [owned, setOwned] = useState(false)
  useEffect(() => {
    setOwned(false)
    let active = true
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    fetch('/api/my-facilities', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) return
      const data = await response.json()
      if (active) setOwned(data.facilities?.some((facility: { id: string }) => facility.id === facilityId) === true)
    }).catch(() => {}).finally(() => clearTimeout(timeout))
    return () => { active = false; controller.abort(); clearTimeout(timeout) }
  }, [facilityId])
  if (!owned) return null
  return <div className="flex flex-wrap justify-end gap-2">
    <a href={facilityManagementUrl(facilityId)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/95 px-4 text-xs font-bold text-slate-800 shadow-sm"><Camera className="h-4 w-4" />カバー写真・プロフィールを編集</a>
    <a href={facilityManagementUrl(facilityId, 'posts')} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-slate-900/85 px-4 text-xs font-bold text-white shadow-sm"><PencilLine className="h-4 w-4" />投稿する</a>
  </div>
}
