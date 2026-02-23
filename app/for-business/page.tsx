import type { Metadata } from 'next'
import {
  ImagePlus,
  Calculator,
  FileText,
  MessageSquare,
  ArrowRight,
  UserPlus,
  ClipboardEdit,
  Globe,
  CheckCircle2,
} from 'lucide-react'

export const metadata: Metadata = {
  title: '介護事業者の方へ — Cares',
  description:
    '施設の情報をCaresに無料で掲載。写真・料金・パンフレットを自由に投稿して、利用者やケアマネジャーにアピールできます。',
}

const features = [
  {
    icon: ImagePlus,
    title: '写真+テキストで自由に投稿',
    description:
      '施設の雰囲気や日常の様子を、写真とテキストで自由に発信できます。更新はいつでも何度でも可能です。',
  },
  {
    icon: Calculator,
    title: '料金シミュレーターを掲載',
    description:
      '介護度や利用日数に応じた料金を自動計算。利用者が自分で費用を確認できるため、問い合わせの質が上がります。',
  },
  {
    icon: FileText,
    title: 'パンフレットPDFを掲載',
    description:
      '施設のパンフレットをPDFでアップロード。紙の資料をそのままオンラインで配布できます。',
  },
  {
    icon: MessageSquare,
    title: '問い合わせをオンラインで受付',
    description:
      'Caresを通じて利用者やケアマネジャーからの問い合わせを受け取れます。対応漏れを防ぎ、スムーズな連携を実現します。',
  },
]

const steps = [
  {
    number: '1',
    icon: UserPlus,
    title: '無料アカウント作成',
    description: '介護事業者であれば、どなたでも無料でアカウントを作成できます。',
  },
  {
    number: '2',
    icon: ClipboardEdit,
    title: '施設情報を入力',
    description: '施設の概要、写真、料金、パンフレットなど、掲載したい情報を登録します。',
  },
  {
    number: '3',
    icon: Globe,
    title: '公開',
    description: 'Caresに施設情報が公開され、利用者やケアマネジャーに届きます。',
  },
]

export default function ForBusinessPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-cares-50 to-white py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-cares-600 font-semibold text-sm mb-4 tracking-wide">
            介護事業者の方へ
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
            施設の魅力を、
            <br className="hidden sm:block" />
            無料で届けよう。
          </h1>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Caresなら、写真・料金・パンフレットを自由に掲載して、
            <br className="hidden md:block" />
            利用者やケアマネジャーに施設の情報を届けられます。
            <br className="hidden md:block" />
            <span className="font-semibold text-gray-900">すべて無料</span>
            でご利用いただけます。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://app.carespace.jp/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-cares-600 text-white rounded-lg hover:bg-cares-700 font-semibold text-lg transition-colors"
            >
              無料で始める
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="https://app.carespace.jp"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-cares-700 border-2 border-cares-200 rounded-lg hover:border-cares-400 font-semibold text-lg transition-colors"
            >
              ログイン
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Caresでできること
            </h2>
            <p className="text-gray-500">
              施設の情報発信に必要な機能を、すべて無料で提供します。
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-cares-300 hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 bg-cares-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-cares-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free Emphasis Banner */}
      <section className="bg-cares-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-5 py-2 shadow-sm border border-cares-200 mb-4">
            <CheckCircle2 className="w-5 h-5 text-cares-600" />
            <span className="font-semibold text-cares-700">完全無料</span>
          </div>
          <p className="text-gray-700 leading-relaxed">
            アカウント作成も、投稿も、料金掲載も、パンフレットのアップロードも。
            <br className="hidden sm:block" />
            Caresの掲載機能はすべて無料でお使いいただけます。追加費用は一切かかりません。
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              かんたん3ステップで公開
            </h2>
            <p className="text-gray-500">
              最短数分で、施設の情報をCaresに掲載できます。
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center relative">
                {/* Connector line (desktop only) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-cares-200" />
                )}
                <div className="w-16 h-16 bg-cares-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                  <step.icon className="w-7 h-7 text-cares-600" />
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-cares-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="bg-gradient-to-b from-white to-cares-50 py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            今すぐ施設情報を掲載しませんか？
          </h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            無料アカウントを作成して、施設の魅力を発信しましょう。
            <br className="hidden sm:block" />
            利用者やケアマネジャーが、あなたの施設を見つけてくれます。
          </p>
          <a
            href="https://app.carespace.jp/register"
            className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-cares-600 text-white rounded-lg hover:bg-cares-700 font-semibold text-lg transition-colors shadow-lg shadow-cares-600/20"
          >
            無料で始める
            <ArrowRight className="w-5 h-5" />
          </a>
          <p className="text-xs text-gray-400 mt-4">
            CareSpace OSのアカウントをお持ちの方はそのままログインできます
          </p>
        </div>
      </section>
    </div>
  )
}
