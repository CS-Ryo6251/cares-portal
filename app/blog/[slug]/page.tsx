import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, BookOpen, Clock } from 'lucide-react'
import { formatBlogDate, getBlogPost, getBlogPosts, getRelatedPosts } from '@/lib/blog'

const BASE_URL = 'https://cares.carespace.jp'

export function generateStaticParams() {
  return getBlogPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return { title: '記事が見つかりません — Cares' }

  const url = `${BASE_URL}/blog/${post.slug}`
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${post.title} — Cares`,
      description: post.description,
      url,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: [post.author],
      tags: post.tags,
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  const relatedPosts = getRelatedPosts(post)
  const url = `${BASE_URL}/blog/${post.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Organization',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Cares by CareSpace',
      url: BASE_URL,
    },
    mainEntityOfPage: url,
  }

  return (
    <main className="bg-gradient-to-b from-rose-50/80 via-white to-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <Link href="/blog" className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-cares-700">
          <ArrowLeft className="h-4 w-4" />
          記事一覧へ
        </Link>

        <header className="overflow-hidden rounded-[2rem] border border-rose-100 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-cares-700 via-cares-600 to-rose-400 p-6 text-white sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em]">
              <BookOpen className="h-4 w-4" />
              {post.heroLabel}
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">{post.title}</h1>
            <p className="mt-4 text-base leading-8 text-white/85">{post.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-b border-rose-100 px-6 py-4 text-sm text-slate-500 sm:px-8">
            <span className="rounded-full bg-cares-50 px-3 py-1 text-xs font-bold text-cares-700">{post.category}</span>
            <span>{formatBlogDate(post.publishedAt)}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {post.readingMinutes}分で読めます
            </span>
            <span>{post.author}</span>
          </div>
        </header>

        <div className="mt-8 rounded-[2rem] border border-rose-100 bg-white px-6 py-7 shadow-sm sm:px-9 sm:py-10">
          <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:text-base prose-p:leading-8 prose-li:leading-8">
            {post.sections.map((section) => (
              <section key={section.heading} className="not-prose mb-9 last:mb-0">
                <h2 className="text-2xl font-black tracking-tight text-slate-950">{section.heading}</h2>
                <div className="mt-4 space-y-4">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-base leading-8 text-slate-700">{paragraph}</p>
                  ))}
                </div>
                {section.bullets && (
                  <ul className="mt-5 space-y-3 rounded-2xl bg-rose-50/70 p-5">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 text-base leading-7 text-slate-700">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cares-500" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-2xl bg-slate-950 p-5 text-white">
            <p className="text-sm font-bold text-cares-200">関連記事を読んだら、実際の事業所ページへ</p>
            <p className="mt-2 text-sm leading-7 text-white/70">
              Caresでは、空き状況・料金・パンフレット・公式投稿など、電話前に確認したい情報をまとめて見られます。
            </p>
            <Link href="/directory" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-rose-50">
              事業所を探す
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </article>

      {relatedPosts.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pb-14">
          <h2 className="mb-4 text-xl font-black text-slate-950">あわせて読みたい記事</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {relatedPosts.map((related) => (
              <Link key={related.slug} href={`/blog/${related.slug}`} className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm transition hover:border-cares-200 hover:shadow-md">
                <p className="text-xs font-bold text-cares-700">{related.category}</p>
                <h3 className="mt-2 text-base font-black leading-snug text-slate-950">{related.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{related.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
