import { AlertTriangle, ShieldCheck } from 'lucide-react'

type DirectoryDisclaimerProps = {
  isOwnerVerified: boolean
}

export default function DirectoryDisclaimer({ isOwnerVerified }: DirectoryDisclaimerProps) {
  if (isOwnerVerified) {
    return (
      <div className="flex items-start gap-2.5 bg-cares-50 border border-cares-200 rounded-xl px-4 py-3">
        <ShieldCheck className="w-5 h-5 text-cares-700 shrink-0 mt-0.5" />
        <p className="text-sm text-cares-900 leading-relaxed">
          このページは介護サービス情報公表システムのオープンデータを土台に、CareSpace連携済みの事業所が公式情報を管理しています。
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
      <AlertTriangle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
      <p className="text-sm text-slate-700 leading-relaxed">
        このページは介護サービス情報公表システムのオープンデータをもとに自動作成されています。口コミ・現場メモはコミュニティ投稿です。正確な情報は事業所へ直接ご確認ください。
      </p>
    </div>
  )
}
