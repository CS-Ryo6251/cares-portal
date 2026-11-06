import type { ProviderAvailability } from '@/lib/provider-availability'

export default function AvailabilityCaption({ availability }: { availability?: ProviderAvailability }) {
  if (!availability?.provider_managed) return null
  if (!availability.published) return <p className="mt-2 text-xs text-slate-500">受入状況は要再確認</p>
  return <p className="mt-2 text-xs leading-5 text-slate-500">事業所の回答{availability.checked_at && ` ／ ${new Date(availability.checked_at).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}確認`}{availability.valid_until && ` ／ ${availability.valid_until}まで`}</p>
}
