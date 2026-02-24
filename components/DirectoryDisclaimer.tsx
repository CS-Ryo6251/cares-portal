import { AlertTriangle, ShieldCheck } from 'lucide-react'

type DirectoryDisclaimerProps = {
  isOwnerVerified: boolean
}

export default function DirectoryDisclaimer({ isOwnerVerified }: DirectoryDisclaimerProps) {
  if (isOwnerVerified) {
    return (
      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 font-medium">
          この事業所はオーナーによって認証されています。
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800 leading-relaxed">
        このページの情報は介護サービス情報公表システムおよびコミュニティからの投稿に基づいています。情報の正確性は保証されません。正確な情報は事業所に直接お問い合わせください。
      </p>
    </div>
  )
}
