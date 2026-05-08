'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { clearPreferredLocation } from '@/lib/client-location'

type Props = {
  href: string
  children: ReactNode
  clearLocation?: boolean
  className?: string
}

export default function FilterChipLink({ href, children, clearLocation = false, className = '' }: Props) {
  return (
    <a
      href={href}
      onClick={() => {
        if (clearLocation) clearPreferredLocation()
      }}
      className={
        className ||
        'inline-flex items-center gap-1.5 px-3 py-2 bg-cares-50 text-cares-700 rounded-lg text-sm font-medium hover:bg-cares-100 transition-colors'
      }
    >
      {children}
      <X className="w-3.5 h-3.5" />
    </a>
  )
}
