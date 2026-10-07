'use client'

import { useState } from 'react'
import { publicWebUrl } from '@/lib/profile-media'

export default function RankingCover({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false)
  const url = !failed && publicWebUrl(src)
  // Provider-managed images may be external. The fallback is a local illustration.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url || '/images/facility-cover-home.webp'} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
}
