'use client'

import { useState } from 'react'
import EditProposalModal from '@/components/EditProposalModal'

type EditButtonProps = {
  listingId: string
  currentValues: Record<string, string | null>
}

export default function EditButton({ listingId, currentValues }: EditButtonProps) {
  const [show, setShow] = useState(false)

  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="text-sm text-gray-500 hover:text-cares-600 font-medium transition-colors"
      >
        情報の修正を提案する
      </button>
      {show && (
        <EditProposalModal
          listingId={listingId}
          currentValues={currentValues}
          onClose={() => setShow(false)}
        />
      )}
    </>
  )
}
