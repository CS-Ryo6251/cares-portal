import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen, Clock, Search } from 'lucide-react'
import { formatBlogDate, getBlogPosts } from '@/lib/blog'

export const metadata: Metadata = {
  title: '介護施設探し・事業所選びの記事',
  description:
    '介護事業所の探し方、空き状況、料金、ケアマネジャーのサービス調整に役立つ情報をCares編集部がまとめます。',
  alternates: {
    canonical: 'https://cares.carespace.jp/blog',
  },
  openGraph: {
    title: '介護施設探し・事業所選びの記事 — Cares',
    description: '空き状況、料金、事業所比較など、介護事業所選びに役立つ情報をまとめています。',
    url: 'https://cares.carespace.jp/blog',
    type: 'website',
  },
}

export default function BlogIndexPage() {
  const posts = getBlogPosts()
  const categories = Array.from(new Set(posts.map((post) => post.category)))

  return (
    <main className="bg-gradient-to-b from-rose-50/80 via-white to-white">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="rounded-[2rem] border border-rose-100 bg-white p-6 shadow-sm sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-cares-50 px-3 py-1.5 text-xs font-bold text-cares-700">
            <BookOpen className="h-4 w-4" />
            Cares Magazine
          </div>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                介護事業所選びを、少しだけ見通しよく。
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                空き状況、料金、サービス調整、事業所の見方。Cares上の公開情報とあわせて読みたい実務寄りの記事をまとめています。
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 p-5 text-white">
              <div className="flex items-center gap-2 text-sm font-bold text-cares-200">
                <Search className="h-4 w-4" />
                事業所検索とあわせて使えます
              </div>
              <p className="mt-3 text-sm leading-7 text-white/70">
                記事で判断軸をつかみ、Caresの事業所ページで公式情報・空き状況・料金・投稿を確認できます。
              </p>
              <Link
                href="/directory"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-rose-50"
              >
                事業所を探す
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {categories.map((category) => (
              <span key={category} className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-bold text-cares-700">
                {category}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="grid gap-5 md:grid-cols-3">
          {posts.map((post) => (
            <article key={post.slug} className="group overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <Link href={`/blog/${post.slug}`} className="block">
                <div className="bg-gradient-to-br from-cares-50 via-white to-rose-100 p-5">
                  <div className="flex h-32 items-end rounded-2xl bg-gradient-to-br from-cares-600 to-rose-400 p-4 text-white shadow-inner">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-white/80">{post.heroLabel}</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="rounded-full bg-cares-50 px-2.5 py-1 text-cares-700">{post.category}</span>
                    <span>{formatBlogDate(post.publishedAt)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {post.readingMinutes}分
                    </span>
                  </div>
                  <h2 className="text-lg font-black leading-snug text-slate-950 group-hover:text-cares-700">{post.title}</h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{post.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-cares-700">
                    読む
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
