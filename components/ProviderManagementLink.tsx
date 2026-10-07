import { Building2, ArrowUpRight } from 'lucide-react'
import { CARESPACE_MANAGEMENT_URL } from '@/lib/cares-navigation'

export default function ProviderManagementLink() {
  return (
    <aside className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-cares-700" />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900">事業所の掲載情報を管理する方</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            空き状況・料金・写真・投稿の編集は、CareSpace OSの「経営支援 → Cares掲載管理」で行います。
          </p>
          <a href={CARESPACE_MANAGEMENT_URL} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-cares-700 hover:underline">
            CareSpace OSで掲載管理を開く<ArrowUpRight className="h-4 w-4 shrink-0" />
          </a>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">掲載管理の権限を持つ担当者が利用できます。ログイン後にタブが表示されない場合は、法人の管理者にご確認ください。</p>
          <a href="/for-business" className="mt-3 inline-block text-xs font-medium text-slate-600 underline underline-offset-2">事業所の新規登録・掲載案内</a>
        </div>
      </div>
    </aside>
  )
}
