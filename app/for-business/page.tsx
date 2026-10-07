import type { Metadata } from 'next'
import Image from 'next/image'
import { ArrowRight, BadgeCheck, Building2, Calculator, Camera, Check, Heart, MapPin, PencilLine, QrCode, Search, ShieldCheck } from 'lucide-react'
import FaqSection from './FaqSection'
import { CARESPACE_MANAGEMENT_URL, CARESPACE_SIGNUP_URL } from '@/lib/cares-navigation'

export const metadata: Metadata = {
  title: '事業所の掲載・情報発信 — Cares by CareSpace',
  description: '写真、日々の投稿、空き状況、料金をひとつの事業所ページに。Caresへの掲載・情報発信はCareSpace OSから管理できます。',
}
const features = [
  { Icon: Camera, title: '写真で、雰囲気が伝わる。', text: 'カバー写真や日々の投稿で、見学の前から事業所のいつものようすを紹介できます。', label: '写真・日々の投稿', color: 'bg-rose-50 text-rose-600' },
  { Icon: Heart, title: '応援が、見える。', text: '事業所への応援と投稿への「いいね」が、ページに集まります。発信を続ける楽しみに。', label: '応援ハート', color: 'bg-orange-50 text-orange-600' },
  { Icon: Calculator, title: '知りたい情報を、ひとつに。', text: '空き状況、料金、パンフレットをまとめて案内。利用条件に合わせた料金の目安も確認できます。', label: '空き状況・料金・資料', color: 'bg-emerald-50 text-emerald-700' },
]
const faqItems = [
  { question: 'すでにCareSpace OSを使っています。どこから管理できますか？', answer: '「掲載管理を開く」から、CareSpace OSのCares掲載管理へ進めます。所属事業所の写真・空き状況・料金・投稿を編集できます。タブが表示されない場合は、法人の管理者に掲載管理の権限をご確認ください。' },
  { question: 'Caresへの利用者登録と、事業所の登録は同じですか？', answer: 'メールアドレス・パスワードは共通で使えますが、利用権限は別です。Caresへの利用者登録だけでは、OSの業務画面や事業所の公式情報を管理できません。公式情報の編集には、CareSpace OSでの事業所への所属と管理権限が必要です。' },
  { question: 'まだ登録していない事業所も掲載されていますか？', answer: '介護サービス情報公表システムのオープンデータをもとに、基本情報を掲載しています。CareSpace OSへの登録・確認後、事業所番号で連携し、写真や投稿などの公式情報を追加できます。' },
  { question: '料金シミュレーションには何が反映されますか？', answer: '対応するサービスでは、事業所が登録した規模・地域区分・届出加算と、利用者の介護度・時間・回数から介護保険の自己負担を試算します。登録した食費などの自費を合算し、目安として共有できます。未確認の条件や対象外の加算等は含まれません。' },
  { question: '無料で使えますか？', answer: '公式ページ、料金表、投稿など、事業所の基本的な情報発信機能は無料で提供する方針です。CareSpace OSの業務管理・経営支援機能については、別途ご案内しています。' },
]
const primary = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-500'

export default function ForBusinessPage() {
  return <div className="overflow-hidden bg-[#fffcf9] text-slate-900">
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-20">
      <div>
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700"><span className="h-px w-7 bg-rose-300" />事業所のみなさまへ</p>
        <h1 className="mt-6 text-[2.15rem] font-bold leading-[1.5] tracking-tight sm:text-5xl sm:leading-[1.45]">いつもの一日を、<br /><span className="text-rose-600">事業所の魅力に。</span></h1>
        <p className="mt-6 max-w-md text-sm leading-8 text-slate-600 sm:text-base">スタッフの笑顔、今日の活動、いまの空き状況。<br className="hidden sm:block" />電話だけでは伝えきれない事業所のようすを、<br className="hidden sm:block" />ご家族やケアマネへ届けませんか。</p>
        <div className="mt-8 flex flex-col items-start gap-4">
          <a href={CARESPACE_MANAGEMENT_URL} className={primary}>掲載管理を開く<ArrowRight className="h-4 w-4" /></a>
          <p className="text-xs leading-6 text-slate-500">CareSpace OSから写真・空き状況・料金・投稿を編集できます。</p>
          <a href={CARESPACE_SIGNUP_URL} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700 underline decoration-rose-200 underline-offset-4">はじめての方は、事業所登録へ<ArrowRight className="h-4 w-4" /></a>
        </div>
      </div>
      <div className="relative mx-auto w-full max-w-md">
        <div className="absolute -inset-5 rounded-[3rem] bg-[#f8e9e6] sm:-rotate-3" aria-hidden="true" />
        <div className="relative overflow-hidden rounded-[1.75rem] border border-white bg-white shadow-[0_20px_55px_-25px_rgba(122,47,61,0.28)]">
          <div className="relative h-36 sm:h-44"><Image src="/images/facility-cover-home.webp" alt="家と庭のカバーイラスト" fill sizes="(max-width: 640px) 90vw, 448px" priority className="object-cover" /><span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-semibold text-slate-600">ページの表示例</span></div>
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <div className="relative -mt-7 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-white bg-rose-50"><Building2 className="h-7 w-7 text-rose-500" /></div>
            <div className="mt-3 flex items-center gap-2"><h2 className="text-lg font-bold">デイサービス ひだまりの庭</h2><BadgeCheck className="h-5 w-5 shrink-0 text-rose-500" aria-label="公式ページの表示例" /></div>
            <p className="mt-2 text-xs leading-6 text-slate-500">ほっと笑顔になれる、地域の居場所。<br />私たちの日々のようすをお届けします。</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-slate-100 py-3"><span className="inline-flex items-center gap-1.5 text-sm font-bold text-rose-600"><Heart className="h-4 w-4 fill-current" />128<span className="text-[10px] font-normal text-slate-500">応援ハート</span></span><span className="text-xs text-slate-500">12 投稿</span><span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />空きあり</span></div>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#faf8f5] p-2"><div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl"><Image src="/hero-care.jpg" alt="" fill sizes="80px" className="object-cover" /></div><div className="min-w-0"><p className="text-[10px] text-slate-500">日々のようす</p><p className="mt-1 text-xs font-semibold leading-5">今日も、笑顔の時間を<br />みなさんと一緒に。</p></div><Heart className="ml-auto mr-2 h-4 w-4 shrink-0 text-rose-400" /></div>
          </div>
        </div>
        <p className="relative mt-4 text-center text-[10px] text-slate-400">架空の事業所による表示イメージです。</p>
      </div>
    </section>

    <section className="border-y border-[#eee6e2] bg-white/70 px-5 py-5 sm:px-8"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-3 text-xs text-slate-600 sm:text-sm">{['写真も、空き状況もひとつのページに','URL・QRで、その場で共有','編集はCareSpace OSから'].map(text=><p key={text} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-rose-500" />{text}</p>)}</div></section>

    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <p className="text-xs font-semibold tracking-wider text-rose-700">Caresでできること</p><h2 className="mt-3 text-2xl font-bold leading-relaxed sm:text-3xl">知ってもらうきっかけを、<br className="sm:hidden" />日々の発信から。</h2>
      <div className="mt-9 grid gap-4 md:grid-cols-3">{features.map(({Icon,title,text,label,color})=><article key={title} className="rounded-3xl border border-[#eee6e2] bg-white p-6 sm:p-7"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}><Icon className="h-6 w-6" /></div><p className="mt-6 text-[11px] font-semibold text-slate-500">{label}</p><h3 className="mt-2 text-lg font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{text}</p></article>)}</div>
    </section>

    <section className="mx-auto max-w-6xl px-5 pb-14 sm:px-8 sm:pb-20"><div className="grid gap-8 rounded-[2rem] bg-[#eef4ef] p-6 sm:p-10 lg:grid-cols-2 lg:items-center"><div><span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-emerald-700"><QrCode className="h-5 w-5" /></span><h2 className="mt-5 text-2xl font-bold leading-relaxed sm:text-3xl">「うちの事業所です」を、<br />スマホで、すぐに。</h2><p className="mt-4 text-sm leading-8 text-slate-600">訪問先でページを見せたり、QRを読み取ってもらったり。事業所の写真も料金も、その場で案内できます。</p></div><div className="space-y-3">{[{Icon:MapPin,title:'ケアマネへのご案内に',text:'いまの空き状況や受け入れ条件を共有。'},{Icon:Camera,title:'ご家族との見学前の会話に',text:'写真や投稿で、普段の雰囲気を紹介。'},{Icon:Calculator,title:'利用料金のご説明に',text:'利用する時間・回数を合わせて、目安を確認。'}].map(({Icon,title,text})=><div key={title} className="flex items-start gap-3 rounded-2xl bg-white/90 p-4"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-6 text-slate-500">{text}</p></div></div>)}</div></div></section>

    <section className="bg-white px-5 py-14 sm:px-8 sm:py-20"><div className="mx-auto max-w-6xl"><div className="max-w-xl"><p className="text-xs font-semibold tracking-wider text-rose-700">はじめかた</p><h2 className="mt-3 text-2xl font-bold sm:text-3xl">自分たちのページを、育てていく。</h2><p className="mt-4 text-sm leading-7 text-slate-600">掲載情報の確認から、最初の投稿まで。<br />公式情報は、事業所の担当者が管理できます。</p></div><ol className="mt-9 grid gap-7 md:grid-cols-3">{[{Icon:Search,title:'事業所を見つける',text:'まずはCaresで、ご自身の事業所の掲載情報を確認。',href:'/',link:'事業所をさがす'},{Icon:ShieldCheck,title:'OSから掲載管理へ',text:'OSに登録済みなら、そのアカウントで掲載管理を開けます。',href:CARESPACE_MANAGEMENT_URL,link:'掲載管理を開く'},{Icon:PencilLine,title:'写真や投稿を届ける',text:'カバー写真を整え、今日の活動やお知らせをひとつ投稿。',href:CARESPACE_MANAGEMENT_URL+'?cares_section=posts',link:'投稿画面を開く'}].map(({Icon,title,text,href,link},i)=><li key={title} className="border-t border-[#eee6e2] pt-5"><div className="flex items-center justify-between"><span className="font-serif text-3xl text-rose-300">0{i+1}</span><Icon className="h-5 w-5 text-slate-400" /></div><h3 className="mt-4 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{text}</p><a href={href} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-rose-700">{link}<ArrowRight className="h-4 w-4" /></a></li>)}</ol><p className="mt-8 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">まだOSに登録していない方は、<a href={CARESPACE_SIGNUP_URL} className="font-semibold text-rose-700 underline underline-offset-4">事業所登録</a>から。事業所番号・組織情報の確認後、掲載情報を管理できます。</p></div></section>

    <section className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20"><h2 className="text-center text-2xl font-bold">よくあるご質問</h2><div className="mt-8"><FaqSection items={faqItems} /></div></section>
    <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8"><div className="rounded-[2rem] border border-rose-100 bg-rose-50/70 px-5 py-10 text-center sm:p-12"><Heart className="mx-auto h-7 w-7 text-rose-500" /><h2 className="mt-4 text-2xl font-bold leading-relaxed sm:text-3xl">あなたの事業所の、<br className="sm:hidden" />いいところを届けよう。</h2><p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-slate-600">まずは一枚の写真、一つのお知らせから。<br />家族や地域とのつながりを、Caresで。</p><div className="mt-6 flex flex-wrap justify-center gap-3"><a href={CARESPACE_MANAGEMENT_URL} className={primary}>掲載管理を開く<ArrowRight className="h-4 w-4" /></a><a href={CARESPACE_SIGNUP_URL} className="inline-flex min-h-12 items-center justify-center rounded-full border border-rose-200 bg-white px-6 py-3 text-sm font-semibold text-rose-700">事業所を登録する</a></div></div></section>
  </div>
}
