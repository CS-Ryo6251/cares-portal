export type BlogSection = {
  heading: string
  body: string[]
  bullets?: string[]
}

export type BlogPost = {
  slug: string
  title: string
  description: string
  category: string
  publishedAt: string
  updatedAt?: string
  readingMinutes: number
  author: string
  tags: string[]
  heroLabel: string
  sections: BlogSection[]
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'how-to-check-care-vacancy',
    title: '介護事業所の空き状況を見るときに、最初に確認したい3つのこと',
    description:
      '空きあり・空きなしだけで判断せず、更新日、受け入れ条件、次の連絡先を確認することで、問い合わせの手戻りを減らせます。',
    category: '事業所選び',
    publishedAt: '2026-07-12',
    readingMinutes: 4,
    author: 'Cares編集部',
    tags: ['空き状況', '介護事業所', '問い合わせ'],
    heroLabel: 'Vacancy guide',
    sections: [
      {
        heading: '「空きあり」は、まだ確定情報ではないことが多い',
        body: [
          '介護サービスの受け入れ可否は、利用者の状態、送迎範囲、職員体制、曜日、医療的ケアの有無によって変わります。表示上は空きがあっても、実際には条件付きになることがあります。',
          'そのため、空き状況を見るときは「いま空いているか」だけでなく、「いつ更新された情報か」「どの条件なら相談できるか」まで確認するのが大切です。',
        ],
      },
      {
        heading: '確認したいポイント',
        body: ['問い合わせ前に次の情報が見えると、事業所側とのやり取りがスムーズになります。'],
        bullets: [
          '空き状況の更新日',
          '対象サービス種別と対応エリア',
          '受け入れ条件や注意事項',
          '電話・問い合わせフォーム・パンフレットなどの連絡導線',
        ],
      },
      {
        heading: 'Caresでできること',
        body: [
          'Caresでは、公表データに加えて、事業所公式の空き状況、料金、写真、パンフレット、地域の専門職からの評価を重ねて確認できます。',
          '電話する前に知りたい情報をできるだけ整理し、利用者・家族・ケアマネジャーが迷いにくい入口を目指しています。',
        ],
      },
    ],
  },
  {
    slug: 'care-service-cost-basics',
    title: '介護サービスの料金目安を調べる前に知っておきたい基本',
    description:
      '介護サービスの月額料金は、サービス種別、介護度、加算、自己負担割合によって変わります。概算を見るときの前提を整理します。',
    category: '料金',
    publishedAt: '2026-07-12',
    readingMinutes: 5,
    author: 'Cares編集部',
    tags: ['料金', '介護保険', '費用'],
    heroLabel: 'Cost basics',
    sections: [
      {
        heading: '料金は「事業所ごと」だけでなく「利用条件ごと」に変わる',
        body: [
          '同じサービス種別でも、要介護度、利用回数、加算、地域区分、自己負担割合によって実際の支払額は変わります。',
          '料金表を見るときは、単価だけでなく、どの条件で計算された金額なのかを合わせて確認する必要があります。',
        ],
      },
      {
        heading: '概算があると相談が早くなる',
        body: [
          '正確な費用はケアプランや契約内容によって変わりますが、事前に概算が分かるだけでも、家族内の相談や候補比較はしやすくなります。',
          'Caresでは、CareSpaceOS側で事業所が整備した料金表を公開ページへ反映し、料金の見通しを立てやすくする構成を想定しています。',
        ],
      },
      {
        heading: '見るべき項目',
        body: ['料金目安を見るときは、最低限次の項目がそろっているか確認しましょう。'],
        bullets: [
          '介護保険内の自己負担額',
          '食費・居住費・日用品費など保険外費用',
          '加算や追加料金の条件',
          '月額例の前提となる介護度・利用回数',
        ],
      },
    ],
  },
  {
    slug: 'what-care-managers-check',
    title: 'ケアマネジャーが事業所を探すときに比較したい情報',
    description:
      'ケアマネジャーが候補事業所を探すときは、所在地やサービス種別だけでなく、受け入れ姿勢や連絡しやすさも重要です。',
    category: '専門職向け',
    publishedAt: '2026-07-12',
    readingMinutes: 4,
    author: 'Cares編集部',
    tags: ['ケアマネジャー', 'サービス調整', '事業所比較'],
    heroLabel: 'Care coordination',
    sections: [
      {
        heading: '候補探しは、情報の鮮度で差が出る',
        body: [
          'ケアマネジャーが事業所を探す場面では、複数の候補へ短時間で確認する必要があります。公表データだけでは、現在の空き状況や受け入れ方針までは分かりにくいことがあります。',
          '事業所が自分たちで更新した情報や、地域の専門職からの評価が集まると、候補選定の精度は上がります。',
        ],
      },
      {
        heading: '比較しやすい情報',
        body: ['候補を並べるときは、次の情報があると判断しやすくなります。'],
        bullets: [
          '対応エリアと送迎範囲',
          '空き状況と更新日',
          '電話番号・問い合わせ方法',
          '写真、パンフレット、利用者層のイメージ',
          '地域の専門職から見た対応の特徴',
        ],
      },
      {
        heading: 'CaresとCareSpaceOSのつながり',
        body: [
          'Caresは外部に公開される事業所ページ、CareSpaceOSは事業所側が情報を整える管理側という位置づけです。',
          'CareSpaceOSで整備された公式情報がCaresに反映されることで、「掲載したい」と思える公開ページと、現場で使える管理機能をつなげていきます。',
        ],
      },
    ],
  },
]

export function getBlogPosts() {
  return [...blogPosts].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
}

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug) || null
}

export function getRelatedPosts(current: BlogPost) {
  return getBlogPosts()
    .filter((post) => post.slug !== current.slug)
    .filter((post) => post.category === current.category || post.tags.some((tag) => current.tags.includes(tag)))
    .slice(0, 3)
}

export function formatBlogDate(date: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}
