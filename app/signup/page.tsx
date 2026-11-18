import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export default function SignupPage() {
  return <main className="mx-auto max-w-xl px-5 py-12">
    <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-bold text-emerald-700">介護・医療・福祉の業界関係者の方へ</p>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">Caresの登録は、CareSpace OSで</h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">共通アカウントで、Caresの情報確認からサービス調整、事業所間の連携・トークルームまで利用できます。職種と所属事業所を登録し、確認後に利用を開始できます。</p>
      <a href="https://app.carespace.jp/signup?source=cares" className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white">CareSpace OSの利用登録へ（無料）<ArrowUpRight className="h-4 w-4" /></a>
      <p className="mt-3 text-xs leading-6 text-slate-500">無料プランから始められます。FAXなどの通信費は別途かかります。</p>
      <p className="mt-5 text-sm leading-7 text-slate-600">すでにCares・CareSpace OSに登録済みの方は、同じメールアドレス・パスワードをお使いください。アカウントの作り直しは不要です。</p>
      <Link href="/login" className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-emerald-800 underline">共通アカウントでログイン</Link>
      <p className="mt-5 border-t pt-5 text-sm leading-7 text-slate-600">ご本人・ご家族など一般の方は、登録なしで事業所・空き情報を探し、見学・利用を相談できます。</p>
      <Link href="/directory" className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-slate-700 underline">登録せずに事業所を探す</Link>
    </section>
  </main>
}
