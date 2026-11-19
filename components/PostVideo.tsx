'use client'

import { useState } from 'react'

export default function PostVideo({ src, className = '' }: { src: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  return <div className="bg-black">
    <video src={src} controls playsInline preload="metadata" aria-label="投稿動画" onError={() => setFailed(true)} className={`w-full ${className}`} />
    {failed && <p role="alert" className="p-4 text-sm leading-6 text-white">この端末では動画を再生できません。<a href={src} target="_blank" rel="noopener noreferrer" className="ml-2 underline">動画を開く</a></p>}
  </div>
}
