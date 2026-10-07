'use client'
import { useState } from 'react'
import { QrCode } from 'lucide-react'
import FacilityShareDialog from './FacilityShareDialog'

export default function FacilityProfileShare({ name, facilityId }: { name: string; facilityId: string }) {
  const [open, setOpen] = useState(false)
  return <>
    <button onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"><QrCode className="h-4 w-4" />共有</button>
    {open && <FacilityShareDialog facilityName={name} publicUrl={`https://cares.carespace.jp/facility/${facilityId}`} onClose={() => setOpen(false)} />}
  </>
}
