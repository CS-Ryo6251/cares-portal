import type { Metadata } from 'next'
import {
  ArrowRight,
  UserPlus,
  ClipboardEdit,
  Globe,
  CheckCircle2,
  Building2,
  Users,
  CalendarX,
  Wallet,
  ChevronRight,
} from 'lucide-react'
import FaqSection from './FaqSection'

export const metadata: Metadata = {
  title: '掲載をご希望の方へ — Cares',
  description:
    '介護施設の情報を無料でCaresに掲載。ケアマネジャーやご家族に施設の「いま」を届けて、選ばれる施設に。',
}

const pains = [
  {
    icon: Building2,
    text: 'ホームページが古いまま。更新する時間も担当者もいない',
  },
  {
    icon: Users,
    text: 'ケアマネへの営業が訪問頼みで、担当者が辞めると紹介が減る',
  },
  {
    icon: CalendarX,
    text: '空きが出ても、外部にうまく伝える手段がない',
  },
  {
    icon: Wallet,
    text: '集客に広告費をかける余裕がない',
  },
]

const stats = [
  { number: '全国対応', label: '利用エリア' },
  { number: '¥0', label: '利用料金' },
  { number: '無制限', label: '投稿回数' },
  { number: 'QR対応', label: '施設ページ共有' },
]

const benefits = [
  {
    number: '01',
    title: '施設ページがそのまま営業ツールになる',
    description:
      '施設の概要、写真、料金、パンフレット——すべてが1つのページにまとまります。QRコードを名刺やチラシに載せるだけで、ケアマネや家族にいつでも最新情報を共有できます。ホームページがなくても大丈夫です。',
    result: '名刺・チラシから施設情報にすぐアクセス',
    image: '/benefit-01.jpg',
  },
  {
    number: '02',
    title: '空き情報を、すぐに必要な人に届けられる',
    description:
      '空きが出たその日に投稿するだけで、「今すぐ入居先を探している」家族やケアマネに届きます。電話やFAXで個別に連絡する手間がなくなり、空き期間が短縮します。',
    result: '空き室の埋まるスピードが上がる',
    image: '/benefit-02.jpg',
  },
  {
    number: '03',
    title: '「うちのらしさ」を、無料で発信し続けられる',
    description:
      '日常の様子、行事・イベント、スタッフ紹介——更新のたびに、施設の「らしさ」が伝わります。広告費ゼロで、あなたの施設を選ぶ理由を作り続けられます。',
    result: '施設ブランドの形成と入居検討者の信頼獲得',
    image: '/benefit-03.jpg',
  },
]


const steps = [
  {
    number: '1',
    icon: UserPlus,
    title: '無料アカウントを作成',
    description:
      'かんたんな情報入力で登録完了。クレジットカード不要。',
    time: 'かんたん登録',
  },
  {
    number: '2',
    icon: ClipboardEdit,
    title: '施設情報を入力する',
    description:
      '概要、写真、空き状況、料金を入力。できる範囲から始めて、あとから追加できます。',
    time: '5〜10分',
  },
  {
    number: '3',
    icon: Globe,
    title: '公開してみんなに届く',
    description:
      '「公開」ボタンを押すだけ。情報を更新するたびに、ケアマネや家族に届き続けます。',
    time: '即時公開',
  },
]

const faqItems = [
  {
    question: '本当に無料ですか？有料プランへの切り替えを求められますか？',
    answer:
      'はい、施設情報の掲載、写真・動画投稿、料金シミュレーター、パンフレットPDF掲載、問い合わせ受付——すべての掲載機能を無料でご利用いただけます。顧客管理や業務効率化などの機能をご活用いただく場合は、有料プランをご用意しております。',
  },
  {
    question: 'ITが苦手でも使えますか？',
    answer:
      'はい、ご安心ください。スマートフォンから写真を撮って投稿するだけの操作感で設計しています。パソコンが苦手な方でも無理なくお使いいただけます。',
  },
  {
    question: '掲載に審査はありますか？',
    answer:
      'アカウント登録後すぐに施設情報の入力・掲載が可能です。審査や承認待ちはありません。',
  },
  {
    question: '掲載をやめたいときはすぐに停止できますか？',
    answer:
      'はい、いつでもご自身のアカウントから掲載を非公開にできます。退会手続きもアカウント設定からいつでも行えます。縛りや解約違約金は一切ありません。',
  },
  {
    question: '空き情報はどれくらいの頻度で更新すればいいですか？',
    answer:
      '頻度に決まりはありませんが、空き状況が変わったタイミングでの更新をおすすめしています。「今日空きが出た」という情報ほど、ケアマネジャーや家族にとって価値が高くなります。',
  },
]

export default function ForBusinessPage() {
  return (
    <div>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden py-16 sm:py-24 md:py-32">
        {/* Background image */}
        <img
          src="/hero-care.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Light overlay — keeps the photo bright, text readable */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px]" />

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 bg-cares-100 text-cares-700 rounded-full text-sm font-medium mb-6">
            介護施設の経営者・管理者の方へ
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
            ケアマネに選ばれる施設は、
            <br />
            <span className="text-cares-600">「見える」</span>施設です。
          </h1>
          <p className="text-base sm:text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            空き状況、日常の様子、イベント情報——
            <br className="hidden sm:block" />
            Caresに掲載するだけで、近くのケアマネジャーや
            <br className="hidden sm:block" />
            入居を考えるご家族に、あなたの施設の「いま」が届きます。
          </p>

          {/* Free badge */}
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-5 py-2 mb-8">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-700 text-sm">掲載・利用 すべて完全無料</span>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <a
              href="https://app.carespace.jp/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-cares-600 text-white rounded-xl hover:bg-cares-700 font-semibold text-base sm:text-lg transition-colors shadow-lg shadow-cares-600/20"
            >
              いますぐ無料で掲載を始める
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="https://app.carespace.jp"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-cares-700 border-2 border-cares-200 rounded-xl hover:border-cares-400 font-semibold text-base sm:text-lg transition-colors"
            >
              ログインはこちら
            </a>
          </div>
          <p className="text-sm text-gray-400">
            クレジットカード不要。登録はかんたんです。
          </p>
        </div>
      </section>

      {/* ===== PAIN RECOGNITION ===== */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-center text-cares-600 font-semibold text-sm mb-3 tracking-wide">
            PROBLEM
          </p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
            こんなお悩みはありませんか？
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {pains.map((pain) => (
              <div
                key={pain.text}
                className="flex items-start gap-4 bg-white rounded-xl border border-gray-200 p-5"
              >
                <div className="shrink-0 w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <pain.icon className="w-5 h-5 text-red-400" />
                </div>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{pain.text}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-base sm:text-lg font-medium text-gray-900 mt-10">
            Caresは、そのすべての課題を
            <span className="text-cares-600 font-bold">「掲載するだけ」</span>
            で解決します。
          </p>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="text-center bg-white rounded-xl border border-gray-200 p-5 sm:p-6"
              >
                <p className="text-2xl sm:text-3xl font-bold text-cares-700 mb-1">
                  {stat.number}
                </p>
                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BENEFITS ===== */}
      <section className="py-12 sm:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-center text-cares-600 font-semibold text-sm mb-3 tracking-wide">
            BENEFITS
          </p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 text-center mb-4">
            Caresに掲載すると、何が変わるか
          </h2>
          <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">
            「機能」ではなく、掲載後にあなたの施設で起きる変化をお伝えします。
          </p>

          <div className="space-y-8 sm:space-y-12">
            {benefits.map((benefit, i) => (
              <div
                key={benefit.number}
                className={`rounded-2xl overflow-hidden border border-gray-200 ${
                  i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                } md:flex`}
              >
                {/* Photo */}
                <div className="md:w-2/5 h-48 sm:h-56 md:h-64 relative overflow-hidden bg-gray-100">
                  <img
                    src={benefit.image}
                    alt={benefit.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="md:w-3/5 p-6 sm:p-8 flex flex-col justify-center">
                  <span className="text-cares-400 font-bold text-sm mb-2">{benefit.number}</span>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-4">
                    {benefit.description}
                  </p>
                  <div className="flex items-center gap-2 bg-cares-50 rounded-lg px-4 py-2.5">
                    <ChevronRight className="w-4 h-4 text-cares-600 shrink-0" />
                    <span className="text-sm font-medium text-cares-700">{benefit.result}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BACKSTORY ===== */}
      <section className="py-12 sm:py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4">
          <p className="text-center text-cares-600 font-semibold text-sm mb-3 tracking-wide">
            STORY
          </p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
            Caresが生まれた理由
          </h2>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 md:p-10">
            {/* Founder photo */}
            <div className="flex justify-center mb-6">
              <img
                src="/founder.jpg"
                alt="創業者"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-cares-100 shadow-sm"
              />
            </div>

            <p className="text-sm sm:text-base text-gray-700 leading-loose text-center">
              ホームページの制作・維持には数十万円。更新のたびに外注費がかかる。でも情報が古いままでは、施設の魅力は伝わらない。介護業界に特化した「自分たちのことを知ってもらうためのツール」もない。一般的なSNSでは、ケアマネや家族に必要な情報が届かない。
            </p>
            <p className="text-sm sm:text-base text-gray-700 leading-loose text-center mt-4">
              営業先では「パンフレットありますか？」と聞かれ、見学前には「料金はどれくらいですか？」と問い合わせが来る。その都度、紙を渡したり電話で説明したり。
            </p>
            <p className="text-sm sm:text-base text-gray-900 font-medium leading-loose text-center mt-4">
              だったら、施設の情報・パンフレット・料金をすべてまとめたページを、誰でも無料で簡単に持てるようにしよう。それがCaresの出発点です。
            </p>

            <p className="text-center text-sm text-gray-500 mt-6">
              三浦 亮 — 株式会社CARESPACE 代表取締役
            </p>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-center text-cares-600 font-semibold text-sm mb-3 tracking-wide">
            HOW IT WORKS
          </p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 text-center mb-4">
            かんたん3ステップで掲載開始
          </h2>
          <p className="text-center text-gray-500 mb-12">
            最短5分で、あなたの施設がCaresに掲載されます。
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center relative">
                {/* Connector line (desktop only) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-cares-200" />
                )}
                <div className="w-20 h-20 bg-cares-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                  <step.icon className="w-9 h-9 text-cares-600" />
                  <span className="absolute -top-1 -right-1 w-7 h-7 bg-cares-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-2">
                  {step.description}
                </p>
                <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                  {step.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-12 sm:py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4">
          <p className="text-center text-cares-600 font-semibold text-sm mb-3 tracking-wide">
            FAQ
          </p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
            よくある質問
          </h2>
          <FaqSection items={faqItems} />
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <img
          src="/cta-care.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px]" />

        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            今日、あなたの施設を
            <br />
            「見える」施設にしませんか。
          </h2>
          <p className="text-base sm:text-lg text-gray-600 mb-8">
            掲載は5分で完了。費用は、永久に、ゼロです。
          </p>
          <a
            href="https://app.carespace.jp/signup"
            className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-cares-600 text-white rounded-xl hover:bg-cares-700 font-semibold text-lg transition-colors shadow-lg shadow-cares-600/20"
          >
            無料で掲載を始める
            <ArrowRight className="w-5 h-5" />
          </a>

          {/* Trust signals */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-6">
            {['クレジットカード不要', 'いつでも削除・退会可能', '登録後すぐに掲載開始'].map((signal) => (
              <span key={signal} className="flex items-center gap-1.5 text-sm text-gray-500">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                {signal}
              </span>
            ))}
          </div>

          <p className="text-sm text-gray-400 mt-8">
            すでにアカウントをお持ちの方は{' '}
            <a href="https://app.carespace.jp" className="text-cares-600 hover:underline font-medium">
              ログインはこちら
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}
