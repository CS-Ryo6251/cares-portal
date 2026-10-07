import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, Clock3 } from 'lucide-react'
import { formatBlogDate, getBlogCategory, getBlogImage, getBlogPost, getBlogPosts, getRelatedPosts } from '@/lib/blog'
import ArticleCard from '@/components/blog/ArticleCard'
const BASE_URL = 'https://cares.carespace.jp'
type Props = { params: Promise<{ slug: string }> }
export function generateStaticParams() { return getBlogPosts().map((post) => ({ slug: post.slug })) }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return { title: '記事が見つかりません' }
  const image = { url: getBlogImage(post), width: 1440, height: 960, alt: getBlogCategory(post.category).imageAlt }
  return { title: post.title, description: post.description, alternates: { canonical: `${BASE_URL}/blog/${post.slug}` },
    openGraph: { title: `${post.title} — Cares`, description: post.description, url: `${BASE_URL}/blog/${post.slug}`, type: 'article', publishedTime: post.publishedAt, modifiedTime: post.updatedAt, authors: [post.author], tags: post.tags, images: [image] },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description, images: [image.url] },
  }
}
export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()
  const category = getBlogCategory(post.category)
  const related = getRelatedPosts(post)
  const url = `${BASE_URL}/blog/${post.slug}`
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description: post.description, datePublished: post.publishedAt, dateModified: post.updatedAt, author: { '@type': 'Organization', name: post.author }, publisher: { '@type': 'Organization', name: 'Cares by CareSpace', url: BASE_URL }, mainEntityOfPage: url, image: `${BASE_URL}${getBlogImage(post)}`, articleSection: category.label, inLanguage: 'ja', ...(post.original ? { isBasedOn: { '@type': 'Article', url: post.original.url, headline: post.original.title, datePublished: post.original.publishedAt } } : {}) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'ホーム', item: BASE_URL }, { '@type': 'ListItem', position: 2, name: 'コラム', item: `${BASE_URL}/blog` }, { '@type': 'ListItem', position: 3, name: post.title, item: url }] },
  ]
  return <div className="bg-[#fbf9f5] text-stone-800">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-7 sm:px-8 sm:pb-24 sm:pt-10">
      <nav aria-label="パンくず" className="mb-8 flex flex-wrap items-center gap-2 text-xs text-stone-500"><Link href="/blog" className="inline-flex min-h-11 items-center gap-2 hover:text-cares-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" />コラム一覧</Link><span aria-hidden="true">/</span><Link href={`/blog?category=${post.category}#articles`} className="inline-flex min-h-11 items-center hover:text-cares-700">{category.label}</Link></nav>
      <article>
        <header className="mx-auto max-w-4xl">
          <Link href={`/blog?category=${post.category}#articles`} className="inline-flex min-h-9 items-center rounded-full border border-rose-200 bg-white px-4 text-xs font-bold text-cares-800">{category.label}</Link>
          <h1 className="mt-5 font-serif text-[1.8rem] font-semibold leading-[1.6] tracking-wide sm:text-[2.6rem]">{post.title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-stone-600">{post.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs leading-6 text-stone-500"><span>{post.author}</span><span className="inline-flex items-center gap-1.5"><Clock3 aria-hidden="true" className="h-3.5 w-3.5" />約{post.readingMinutes}分で読めます</span><span>Cares掲載 <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time></span><span>更新 <time dateTime={post.updatedAt}>{formatBlogDate(post.updatedAt)}</time></span></div>
          <div className="relative mt-7 aspect-[16/9] overflow-hidden rounded-2xl sm:aspect-[2/1] sm:rounded-3xl"><Image src={getBlogImage(post)} alt={category.imageAlt} fill priority sizes="(max-width: 767px) 100vw, 900px" className="object-cover" /></div>
          {post.original && <div className="mt-5 border-l-2 border-rose-300 pl-4 text-xs leading-7 text-stone-600"><p>原記事：{post.original.publisher}・<time dateTime={post.original.publishedAt}>{formatBlogDate(post.original.publishedAt)}</time></p><p><a href={post.original.url} className="underline decoration-stone-300 underline-offset-4 hover:text-cares-700">{post.original.title}</a>をもとに、Cares向けに再編集しています。</p></div>}
        </header>
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-14">
          <div className="min-w-0">
            <div className="mb-10 rounded-2xl border border-[#e2e6dc] bg-[#eef1e9] p-6"><p className="flex items-center gap-2 text-xs font-bold text-[#385643]"><BookOpen aria-hidden="true" className="h-4 w-4" />この記事のポイント</p><p className="mt-3 text-base font-medium leading-8 text-stone-700">{post.takeaway}</p></div>
            <details className="mb-10 rounded-xl border border-stone-200 bg-white p-5 lg:hidden"><summary className="cursor-pointer text-sm font-bold">この記事の目次</summary><ol className="mt-4 space-y-2">{post.sections.map((section, index) => <li key={section.heading}><a href={`#section-${index + 1}`} className="block py-2 text-sm leading-6 text-stone-600">{String(index + 1).padStart(2, '0')}　{section.heading}</a></li>)}</ol></details>
            <div className="space-y-12">{post.sections.map((section, index) => <section id={`section-${index + 1}`} key={section.heading} className="scroll-mt-24"><h2 className="border-b border-stone-200 pb-4 text-xl font-bold leading-relaxed sm:text-2xl">{section.heading}</h2><div className="mt-5 space-y-5">{section.body.map((paragraph) => <p key={paragraph} className="text-base leading-[2.15] text-stone-700">{paragraph}</p>)}</div>{!!section.bullets?.length && <ul className="mt-6 space-y-3 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">{section.bullets.map((bullet) => <li key={bullet} className="flex gap-3 text-sm leading-7 text-stone-700"><Check aria-hidden="true" className="mt-1.5 h-4 w-4 shrink-0 text-cares-700" /><span>{bullet}</span></li>)}</ul>}</section>)}</div>
            <section aria-label="記事の参考資料" className="mt-12 border-t border-stone-200 pt-6 text-xs leading-7 text-stone-600">
              <h2 className="font-bold text-stone-700">{post.sources.length ? '参考資料・情報の確認について' : '編集について'}</h2>
              {!!post.sources.length && <ul className="mt-3 space-y-2">{post.sources.map((source) => <li key={source.url}><a href={source.url} className="inline-flex items-start gap-1 underline decoration-stone-300 underline-offset-4 hover:text-cares-700">{source.title}<ArrowUpRight aria-hidden="true" className="mt-1.5 h-3 w-3 shrink-0" /></a></li>)}</ul>}
              <p className="mt-3">情報確認日：<time dateTime={post.reviewedAt}>{formatBlogDate(post.reviewedAt)}</time>。確認項目や相談メモはCares編集部による提案です。{post.sources.length > 0 && '制度の対象や費用は、自治体・事業所とご自身の条件に照らしてご確認ください。'}</p>
            </section>
            <aside className="mt-10 rounded-2xl bg-[#f0e6dc] p-6 sm:p-8"><p className="text-xs font-bold tracking-widest text-cares-800">次の一歩を、Caresで。</p><h2 className="mt-3 font-serif text-xl font-semibold leading-relaxed">あなたの地域の事業所を、<br />探してみませんか。</h2><p className="mt-3 text-sm leading-7 text-stone-600">所在地やサービスの種類から候補を探し、掲載されている情報と問い合わせ先を確認できます。</p><Link href="/" className="mt-5 inline-flex min-h-12 items-center gap-4 rounded-full bg-stone-800 px-6 text-sm font-bold text-white hover:bg-stone-700">事業所を探す<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></aside>
          </div>
          <aside aria-label="目次" className="sticky top-24 hidden rounded-2xl border border-stone-200 bg-white p-5 lg:block"><p className="text-[10px] font-bold tracking-[0.2em] text-cares-800">CONTENTS</p><p className="mb-4 mt-2 text-sm font-bold">この記事でわかること</p><ol className="space-y-2">{post.sections.map((section, index) => <li key={section.heading}><a href={`#section-${index + 1}`} className="flex gap-3 rounded-lg py-2 text-xs leading-6 text-stone-600 hover:text-cares-700"><span className="text-cares-700">{String(index + 1).padStart(2, '0')}</span>{section.heading}</a></li>)}</ol><Link href="/blog#articles" className="mt-5 inline-flex min-h-11 items-center gap-2 border-t border-stone-100 pt-4 text-xs font-bold text-cares-800"><ArrowLeft aria-hidden="true" className="h-3 w-3" />ほかの記事を探す</Link></aside>
        </div>
      </article>
      <section aria-labelledby="related-heading" className="mt-16 border-t border-stone-200 pt-9"><div className="mb-7 flex items-center justify-between gap-4"><h2 id="related-heading" className="font-serif text-2xl font-semibold">あわせて読みたい</h2><Link href="/blog" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-cares-800">コラム一覧<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></div><div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{related.map((item) => <ArticleCard key={item.slug} post={item} />)}</div></section>
    </div>
  </div>
}
