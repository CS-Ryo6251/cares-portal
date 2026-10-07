import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, BookOpen, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { blogCategories, blogLibraryHref, blogPosts, getBlogLibrary, getBlogPost, getBlogImage, type BlogFilters } from '@/lib/blog'
import ArticleCard, { ArticleMeta } from '@/components/blog/ArticleCard'

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams
  return {
    title: '介護のコラム｜はじめての介護から、事業所選びまで',
    description: '介護の始め方、事業所選び、費用、家族の暮らし、専門職の連携。Cares編集部が日々の迷いをほどく記事をお届けします。',
    alternates: { canonical: 'https://cares.carespace.jp/blog' },
    robots: Object.values(params).some(Boolean) ? { index: false, follow: true } : undefined,
    openGraph: { title: 'Cares コラム｜介護を知ると、暮らしが少し見えてくる。', url: 'https://cares.carespace.jp/blog', type: 'website', images: [{ url: '/images/blog/getting-started.webp', width: 1440, height: 960, alt: '家族と支援者の相談風景' }] },
  }
}
export default async function BlogIndexPage({ searchParams }: PageProps) {
  const raw = await searchParams
  const filters: BlogFilters = {}
  for (const key of ['q', 'category', 'year', 'sort', 'page'] as const) filters[key] = typeof raw[key] === 'string' ? raw[key] : undefined
  const library = getBlogLibrary(filters)
  const active = { q: library.q, category: library.category, year: library.year, sort: library.sort }
  const isFiltered = !!(library.q || library.category || library.year || library.page > 1 || library.sort === 'oldest')
  const featured = getBlogPost('first-care-consultation')!
  const picks = ['day-service-visit-checklist', 'care-service-cost-basics'].map((slug) => getBlogPost(slug)!)
  return <div className="bg-[#fbf9f5] text-stone-800">
    <div className="mx-auto max-w-7xl px-5 pb-16 pt-7 sm:px-8 sm:pb-24 sm:pt-10">
      <nav aria-label="パンくず" className="mb-9 flex items-center gap-2 text-xs text-stone-500"><Link href="/" className="py-2 hover:text-cares-700">ホーム</Link><span aria-hidden="true">/</span><span>コラム</span></nav>
      <header className="mb-9 border-b border-stone-200 pb-8 sm:mb-11 sm:flex sm:items-end sm:justify-between sm:gap-8">
        <div><p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cares-800"><BookOpen aria-hidden="true" className="h-4 w-4" />Cares Journal</p><h1 className="font-serif text-[1.8rem] font-semibold leading-[1.6] tracking-wide sm:text-4xl">介護を知ると、<br className="sm:hidden" />暮らしが少し見えてくる。</h1><p className="mt-3 text-sm leading-7 text-stone-600">はじめての相談から、日々の小さな工夫まで。<br className="sm:hidden" />あなたの次の一歩に、役立つ読みものを。</p></div>
        <p className="mt-5 shrink-0 text-xs leading-6 text-stone-500"><span className="font-serif text-3xl text-stone-700">{blogPosts.length}</span><span className="ml-2">の読みもの</span></p>
      </header>
      {!isFiltered && <section aria-label="おすすめの記事" className="mb-12 grid gap-7 lg:grid-cols-[1.85fr_1fr]">
        <Link href={`/blog/${featured.slug}`} className="group overflow-hidden rounded-3xl border border-[#eaded2] bg-[#f3ece2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-700">
          <div className="relative aspect-[16/9] sm:aspect-[2/1]"><Image src={getBlogImage(featured)} alt="本人と家族が、窓辺で支援者に相談するイラスト" fill priority sizes="(max-width: 1023px) 100vw, 780px" className="object-cover" /><span className="absolute left-5 top-5 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-cares-800">はじめての方へ</span></div>
          <div className="p-6 sm:p-8"><p className="text-[10px] font-bold tracking-[0.22em] text-cares-800">EDITOR&apos;S PICK</p><h2 className="mt-3 font-serif text-2xl font-semibold leading-relaxed sm:text-[1.8rem]">{featured.title}</h2><p className="mt-3 max-w-xl text-sm leading-7 text-stone-600">{featured.description}</p><div className="mt-5 flex items-center justify-between gap-3"><ArticleMeta post={featured} /><ArrowUpRight aria-hidden="true" className="h-6 w-6 shrink-0 text-cares-800" /></div></div>
        </Link>
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3"><span className="h-px w-6 bg-cares-700" /><h2 className="text-sm font-bold tracking-wider">いま、読んでおきたい</h2></div>
          {picks.map((post) => <Link key={post.slug} href={`/blog/${post.slug}`} className="group grid grid-cols-[112px_1fr] gap-4 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-700 sm:grid-cols-[140px_1fr] lg:grid-cols-1 xl:grid-cols-[132px_1fr]"><div className="relative aspect-square overflow-hidden rounded-xl lg:aspect-[2/1] xl:aspect-square"><Image src={getBlogImage(post)} alt="" fill sizes="(max-width: 639px) 112px, (max-width: 1023px) 140px, (max-width: 1279px) 400px, 132px" className="object-cover" /></div><div className="self-center"><h3 className="text-sm font-bold leading-7 group-hover:text-cares-700">{post.title}</h3><div className="mt-2"><ArticleMeta post={post} /></div></div></Link>)}
          <div className="mt-auto rounded-2xl border border-[#e2e6dc] bg-[#eef1e9] p-5"><p className="font-serif text-lg font-semibold">読んだ先に、<br />あなたの地域の選択肢を。</p><Link href="/" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#385643]">近くの事業所を探す<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></div>
        </div>
      </section>}
      <section id="articles" aria-labelledby="articles-heading" className="scroll-mt-24">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Find your next read</p><h2 id="articles-heading" className="mt-2 font-serif text-2xl font-semibold">読みものを探す</h2></div><p className="text-xs leading-6 text-stone-500">テーマや気になる言葉から、お選びください。</p></div>
        <nav aria-label="記事のテーマ" className="mb-6 flex flex-wrap gap-2">
          <Link href={blogLibraryHref({ ...active, category: '' })} aria-current={!library.category ? 'page' : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${!library.category ? 'border-stone-800 bg-stone-800 text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-500'}`}>すべて<span className="text-xs opacity-80">{blogPosts.length}</span></Link>
          {blogCategories.map((category) => <Link key={category.id} href={blogLibraryHref({ ...active, category: category.id })} aria-current={library.category === category.id ? 'page' : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${library.category === category.id ? 'border-cares-800 bg-cares-800 text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-cares-700 hover:text-cares-700'}`}>{category.label}<span className="text-xs opacity-80">{blogPosts.filter((post) => post.category === category.id).length}</span></Link>)}
        </nav>
        <form key={JSON.stringify(active)} action="/blog#articles" method="get" role="search" className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_auto_auto]">
          {library.category && <input type="hidden" name="category" value={library.category} />}
          <div><label htmlFor="blog-search" className="mb-1.5 block text-xs font-semibold text-stone-600">キーワード</label><div className="relative"><Search aria-hidden="true" className="absolute left-3 top-3.5 h-4 w-4 text-stone-400" /><input id="blog-search" name="q" type="search" maxLength={200} defaultValue={library.q} placeholder="例：見学、料金、家族の相談" className="h-11 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-sm focus:border-cares-700 focus:outline-none focus:ring-2 focus:ring-rose-100" /></div></div>
          <div><label htmlFor="blog-year" className="mb-1.5 block text-xs font-semibold text-stone-600">公開年・原記事の年</label><select id="blog-year" name="year" defaultValue={library.year} className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"><option value="">すべての年</option>{library.years.map((year) => <option key={year} value={year}>{year}年</option>)}</select></div>
          <div><label htmlFor="blog-sort" className="mb-1.5 block text-xs font-semibold text-stone-600">並び順</label><select id="blog-sort" name="sort" defaultValue={library.sort} className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"><option value="newest">新しい記事から</option><option value="oldest">過去の記事から</option></select></div>
          <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-lg bg-cares-800 px-6 text-sm font-bold text-white transition-colors hover:bg-cares-900"><Search aria-hidden="true" className="h-4 w-4" />検索する</button>
        </form>
        <div className="mb-7 mt-5 flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600" role="status"><p><strong className="text-stone-800">{library.total}</strong> 件{library.q && <span>：「{library.q}」の検索結果</span>}</p>{(library.q || library.category || library.year) && <Link href="/blog#articles" className="inline-flex min-h-11 items-center text-xs font-semibold underline underline-offset-4">条件をクリア</Link>}</div>
        {library.posts.length ? <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{library.posts.map((post) => <ArticleCard key={post.slug} post={post} />)}</div> : <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 px-5 py-16 text-center"><Search aria-hidden="true" className="mx-auto mb-4 h-7 w-7 text-stone-400" /><h3 className="text-lg font-bold">条件に合う記事が見つかりませんでした</h3><p className="mt-3 text-sm leading-7 text-stone-600">言葉を短くするか、テーマ・年の条件を変えてみてください。</p><Link href="/blog#articles" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-cares-800">すべての記事を見る<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></div>}
        {library.totalPages > 1 && <nav aria-label="記事一覧のページ" className="mt-12 flex flex-wrap items-center justify-center gap-2">
          {library.page > 1 && <Link href={blogLibraryHref({ ...active, page: String(library.page - 1) })} aria-label="前のページ" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-300"><ChevronLeft aria-hidden="true" className="h-4 w-4" /></Link>}
          {Array.from({ length: library.totalPages }, (_, i) => i + 1).map((page) => <Link key={page} href={blogLibraryHref({ ...active, page: String(page) })} aria-label={`${page}ページ目`} aria-current={page === library.page ? 'page' : undefined} className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-sm ${page === library.page ? 'bg-stone-800 font-bold text-white' : 'border border-stone-300 hover:bg-white'}`}>{page}</Link>)}
          {library.page < library.totalPages && <Link href={blogLibraryHref({ ...active, page: String(library.page + 1) })} aria-label="次のページ" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-300"><ChevronRight aria-hidden="true" className="h-4 w-4" /></Link>}
        </nav>}
      </section>
      <aside className="mt-16 border-t border-stone-200 pt-6 text-xs leading-7 text-stone-500"><p>Cares編集部が、介護の相談・比較に役立つ情報をお届けします。過去記事の再編集版は原記事の日付を表示し、本文でCares掲載日と出典をご案内しています。</p><p>制度に関する情報は各記事の確認日時点のものです。手続きや費用の詳細は、お住まいの自治体・事業所にご確認ください。</p></aside>
    </div>
  </div>
}
