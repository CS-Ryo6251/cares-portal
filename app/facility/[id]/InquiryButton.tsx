'use client'

import { useState } from 'react'
import { Mail, X } from 'lucide-react'
import InquiryForm from './InquiryForm'

type Props = {
  facilityId: string
  facilityName: string
}

export default function InquiryButton({ facilityId, facilityName }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-cares-50 text-cares-700 rounded-lg text-sm font-medium hover:bg-cares-100 transition-colors"
      >
        <Mail className="w-4 h-4" />
        お問い合わせ
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">お問い合わせ</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5">
              <InquiryForm facilityId={facilityId} facilityName={facilityName} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
