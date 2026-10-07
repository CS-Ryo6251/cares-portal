'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import FacilityShareDialog from './FacilityShareDialog'

export default function PostShareButton({ facilityId, facilityName, postId, title, canSupport }: {
  facilityId: string; facilityName: string; postId: string; title?: string | null; canSupport: boolean
}) {
  const [open, setOpen] = useState(false)
  return <>
    <button onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 hover:bg-rose-50">
      <Share2 aria-hidden="true" className="h-4 w-4" />{canSupport ? '投稿を共有して応援を募る' : '投稿を共有する'}
    </button>
    {open && <FacilityShareDialog facilityName={facilityName} postTitle={title || '日々のようす'} requestSupport={canSupport}
      publicUrl={`https://cares.carespace.jp/facility/${facilityId}/posts/${postId}`} onClose={() => setOpen(false)} />}
  </>
}
