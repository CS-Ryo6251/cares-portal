import { ExternalLink, MapPin } from 'lucide-react'

export default function FacilityAddressLink({ name, address, className = '' }: {
  name: string; address?: string | null; className?: string
}) {
  const location = address?.trim()
  if (!location) return null
  const query = [name.trim(), location].filter(Boolean).join(', ')
  return <a
    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
    target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
    aria-label={`${location}をGoogleマップで開く（別タブ）`}
    className={`relative z-10 inline-flex min-h-11 max-w-full items-start gap-1.5 rounded py-2 text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 print:min-h-0 print:py-0 print:no-underline ${className}`}
  >
    <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
    <span className="min-w-0 break-words">{location}</span>
    <ExternalLink aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 print:hidden" />
  </a>
}
