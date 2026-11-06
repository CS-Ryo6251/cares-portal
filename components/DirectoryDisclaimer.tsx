import { AlertTriangle, ShieldCheck } from 'lucide-react'

type DirectoryDisclaimerProps = {
  isOwnerVerified: boolean
  sourceKind?: string | null
}

export default function DirectoryDisclaimer({ isOwnerVerified, sourceKind }: DirectoryDisclaimerProps) {
  const source = sourceKind === 'welfare' ? '障害福祉サービス等情報公表システム（WAM）' : '介護サービス情報公表システム'
  if (isOwnerVerified) {
    return (
      <div className="flex items-start gap-2.5 bg-cares-50 border border-cares-200 rounded-xl px-4 py-3">
        <ShieldCheck className="w-5 h-5 text-cares-700 shrink-0 mt-0.5" />
        <p className="text-sm text-cares-900 leading-relaxed">
          このページは{source}のオープンデータを土台に、管理権限を確認した事業所の担当者が公式情報を管理しています。
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
      <AlertTriangle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
      <p className="text-sm text-slate-700 leading-relaxed">
        このページは{source}のオープンデータをもとに自動作成されています。良かった体験・専門職の声はコミュニティ投稿です。正確な情報は事業所へ直接ご確認ください。
      </p>
    </div>
  )
}
