'use client'

import { useEffect } from 'react'

type ViewTrackerProps = {
  postId: string
}

export default function ViewTracker({ postId }: ViewTrackerProps) {
  useEffect(() => {
    // Avoid duplicate counting per session
    const key = `viewed_${postId}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')

    fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId }),
    }).catch(() => {})
  }, [postId])

  return null
}
