import type { Metadata } from 'next'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  ImagePlus,
  Mail,
  MessageSquareText,
  PencilLine,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import FaqSection from './FaqSection'

export const metadata: Metadata = {
  title: '掲載をご希望の方へ — Cares',
  description:
    'Caresは介護事業所の公式情報、料金表、空き状況、投稿を発信できる情報プラットフォームです。公表データをもとにした事業所ページを公式管理できます。',
}

const heroPoints = [
  '公表データをもとに事業所ページを掲載',
  '公式管理申請後に事業所側で更新',
  '料金表・投稿・空き状況をURLで共有',
]

const managementItems = [
  {
    icon: FileText,
    title: '公式ページ',
    text: '写真、特徴、サービス内容、連絡先、パンフレットをまとめて掲載できます。',
  },
  {
    icon: Calculator,
    title: '料金表・目安計算',
    text: '食費、居住費、加算、介護度別料金を整理し、家族やケアマネに説明しやすくします。',
  },
  {
    icon: Send,
    title: '投稿・お知らせ',
    text: '空き状況、日常の様子、イベント、採用情報を公式情報として発信できます。',
  },
  {
    icon: BarChart3,
    title: '発信管理',
    text: '投稿、料金表、資料、問い合わせ導線をひとつの管理画面に集約していきます。',
  },
]

const flowItems = [
  {
    number: '01',
    icon: Search,
    title: '自分の事業所ページを確認',
    text: '介護サービス情報公表システムのデータをもとに、Cares上に事業所ページが作成されています。',
  },
  {
    number: '02',
    icon: ClipboardCheck,
    title: '公式管理を申請',
    text: '事業所番号や連絡先をもとに、Caresへ管理申請を送ります。',
  },
  {
    number: '03',
    icon: ShieldCheck,
    title: '確認後に連携',
    text: '担当者が確認し、CareSpaceの経営支援メニュー内でCares管理をご案内します。',
  },
]

const useCases = [
  {
    title: '料金の問い合わせに',
    text: '電話で毎回説明していた目安料金を、URLで共有できます。',
  },
  {
    title: 'ケアマネへの情報提供に',
    text: '空き状況や受け入れ条件を、最新の状態で見てもらえます。',
  },
  {
    title: '見学前の不安解消に',
    text: '写真や日常投稿で、事業所の雰囲気を事前に伝えられます。',
  },
]

const faqItems = [
  {
    question: 'まだCaresに登録していない事業所も表示されますか？',
    answer:
      'はい。介護サービス情報公表システムのオープンデータをもとに、事業所ページを作成します。公式管理を申請すると、事業所側で追加情報や投稿を管理できるようになります。',
  },
  {
    question: '公式管理は誰でも申請できますか？',
    answer:
      '事業所の関係者からの申請を想定しています。申請内容を確認したうえで、担当者より連絡し、管理方法やCareSpaceとの連携をご案内します。',
  },
  {
    question: '料金表はどのように使えますか？',
    answer:
      '月額、日額、食費、介護度別料金、初期費用などを項目ごとに登録できます。家族やケアマネへ目安料金として共有でき、公式ページ上ではシミュレーションにも反映されます。',
  },
  {
    question: '無料で使えますか？',
    answer:
      '公式ページ、料金表、投稿など、事業所の基本的な情報発信機能は無料で提供する方針です。より高度な経営支援や業務管理機能はCareSpace側でご案内します。',
  },
]

export default function ForBusinessPage() {
  return (
    <div className="bg-slate-50 text-slate-950">
      <section className="relative isolate overflow-hidden px-4 pb-10 pt-12 sm:pb-14 sm:pt-16 lg:pt-20">
        <img
          src="/hero-care.jpg"
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-slate-950/55" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(15,23,42,0.92),rgba(15,23,42,0.72)_48%,rgba(15,23,42,0.28))]" />

        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur">
              <Sparkles className="h-4 w-4 text-cares-200" />
              介護事業所の情報発信プラットフォーム
            </p>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              事業所の公式情報と料金を、
              <br className="hidden sm:block" />
              必要な人へ正しく届ける。
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
              Caresは、公表データをもとにした事業所ページへ、公式情報・料金表・空き状況・日々の投稿を重ねて発信できる仕組みです。
              家族やケアマネに、電話だけでは伝えきれない事業所の「いま」をURLひとつで共有できます。
            </p>

            <div className="mt-7 grid gap-2 sm:grid-cols-3">
              {heroPoints.map((point) => (
                <div key={point} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-3 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-cares-200" />
                  <span>{point}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/directory"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-4 text-base font-bold text-slate-950 shadow-lg shadow-slate-950/20 transition hover:bg-cares-50"
              >
                自分の事業所を探して申請する
                <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-4 text-base font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                仕組みを見る
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-5">
        <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-3">
          {[
            ['全国の公表データ', '未登録でも基本ページが存在'],
            ['公式管理申請', '事業所確認後に更新権限を案内'],
            ['無料の情報発信', '料金表・投稿・資料を掲載'],
          ].map(([title, text]) => (
            <div key={title} className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-cares-600" />
              <div>
                <p className="text-sm font-bold text-slate-950">{title}</p>
                <p className="mt-1 text-sm text-slate-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-14 sm:py-18">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-sm font-bold tracking-wide text-cares-700">WHY CARES</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                事業所の情報は、探す人に届く形で整理されている必要があります。
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                料金の目安、空き状況、受け入れ条件、日々の雰囲気。家族やケアマネが知りたい情報は多い一方で、事業所側は電話、紙、ホームページ、SNSに情報が分散しがちです。
                Caresでは、まず公表データでページを用意し、そこに事業所の公式情報を足していける状態をつくります。
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-xs font-bold text-cares-700">OFFICIAL PAGE</p>
                    <h3 className="mt-1 text-xl font-bold text-slate-950">居宅介護支援事業所サンプル</h3>
                    <p className="mt-2 text-sm text-slate-500">公表データ + 公式管理情報</p>
                  </div>
                  <span className="rounded-full bg-cares-100 px-3 py-1 text-xs font-bold text-cares-800">公式確認中</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    [Database, '公表データ', '住所・電話・サービス種別'],
                    [ImagePlus, '写真・特徴', '事業所の雰囲気を掲載'],
                    [Calculator, '料金表', '月額目安をわかりやすく'],
                    [MessageSquareText, '投稿', '空き状況や日常を発信'],
                  ].map(([Icon, title, text]) => (
                    <div key={title as string} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                      <Icon className="h-5 w-5 text-cares-600" />
                      <p className="mt-3 text-sm font-bold text-slate-950">{title as string}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{text as string}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:py-18">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold tracking-wide text-cares-700">WHAT YOU CAN MANAGE</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              公式ページで管理できること
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              事業所の魅力と実務的な情報を、検索される場所にまとめて掲載できます。
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {managementItems.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200">
                  <item.icon className="h-5 w-5 text-cares-700" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:py-18">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-bold tracking-wide text-cares-700">FEE TABLE</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                料金の目安を、電話ではなくページで伝えられるように。
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                食費、居住費、加算、介護度別料金、初期費用などを項目ごとに整理。家族やケアマネから「だいたいいくらですか？」と聞かれたときに、公式ページをそのまま案内できます。
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-bold text-slate-400">SIMULATION</p>
                  <p className="mt-1 text-lg font-bold text-slate-950">月額目安</p>
                </div>
                <span className="rounded-full bg-cares-100 px-3 py-1 text-sm font-bold text-cares-800">¥82,000 〜 ¥96,000</span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ['介護サービス費', '要介護2', '¥24,000'],
                  ['食費', '3食 × 30日', '¥45,000'],
                  ['日用品費', '月額', '¥5,000 〜 ¥8,000'],
                  ['任意オプション', '選択式', '必要分のみ反映'],
                ].map(([name, condition, amount]) => (
                  <div key={name} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-slate-950">{name}</p>
                      <p className="mt-1 text-xs text-slate-500">{condition}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-slate-700">{amount}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-6 text-slate-500">
                実際の金額は負担割合、加算、地域区分、利用状況により変動します。Caresでは目安として説明しやすい表示を目指しています。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white px-4 py-14 sm:py-18">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold tracking-wide text-cares-700">HOW IT WORKS</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              いきなり管理画面ではなく、まず申請から。
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Caresだけを知った方にもわかりやすいよう、事業所ページから公式管理を申請し、担当者が確認してからCareSpace側の管理方法をご案内します。
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {flowItems.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-cares-700">{item.number}</span>
                  <item.icon className="h-5 w-5 text-slate-400" />
                </div>
                <h3 className="mt-6 text-lg font-bold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:py-18">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl bg-slate-950 p-6 text-white sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-sm font-bold tracking-wide text-cares-200">USE CASES</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  営業、問い合わせ対応、見学前説明を軽くする。
                </h2>
              </div>
              <div className="grid gap-3">
                {useCases.map((item) => (
                  <div key={item.title} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                    <p className="font-bold">{item.title}</p>
                    <p className="mt-1 text-sm leading-7 text-white/70">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:py-18">
        <div className="mx-auto max-w-3xl">
          <p className="text-center text-sm font-bold tracking-wide text-cares-700">FAQ</p>
          <h2 className="mt-3 text-center text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            よくある質問
          </h2>
          <div className="mt-8">
            <FaqSection items={faqItems} />
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:py-18">
        <div className="mx-auto max-w-5xl rounded-3xl border border-cares-200 bg-cares-50 p-6 text-center sm:p-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white ring-1 ring-cares-200">
            <PencilLine className="h-6 w-6 text-cares-700" />
          </div>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            まずは、自分の事業所ページを確認してください。
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600">
            ページ内の「公式管理を申請する」から申請できます。担当者が確認後、情報発信や料金表の管理方法をご案内します。
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/directory"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cares-700 px-6 py-4 text-base font-bold text-white shadow-lg shadow-cares-700/15 transition hover:bg-cares-800"
            >
              事業所を検索する
              <ArrowRight className="h-5 w-5" />
            </a>
            <a
              href="mailto:info@carespace.jp?subject=Cares%E6%8E%B2%E8%BC%89%E3%81%AE%E7%9B%B8%E8%AB%87"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-4 text-base font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              <Mail className="h-5 w-5" />
              掲載について相談する
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
