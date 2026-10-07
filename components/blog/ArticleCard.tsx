import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Clock3 } from 'lucide-react'
import { type BlogPost, getBlogCategory, getBlogImage, getArchiveDate, formatBlogDate } from '@/lib/blog'
export function ArticleMeta({ post }: { post: BlogPost }) {
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-6 text-stone-500">
    <span>{post.original ? '原記事 ' : ''}<time dateTime={getArchiveDate(post)}>{formatBlogDate(getArchiveDate(post))}</time></span>
    {post.original && <span>再編集</span>}
    <span className="inline-flex items-center gap-1"><Clock3 aria-hidden="true" className="h-3.5 w-3.5" />約{post.readingMinutes}分</span>
  </div>
}
export default function ArticleCard({ post }: { post: BlogPost }) {
  const category = getBlogCategory(post.category)
  return <article className="group min-w-0">
    <Link href={`/blog/${post.slug}`} className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-700">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-stone-100">
        <Image src={getBlogImage(post)} alt="" fill sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 400px" className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.035]" />
        <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-stone-700">{category.label}</span>
      </div>
      <div className="pt-4"><ArticleMeta post={post} /><h3 className="mt-2 text-lg font-bold leading-relaxed tracking-tight text-stone-800 transition-colors group-hover:text-cares-700">{post.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-7 text-stone-600">{post.description}</p><span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-cares-800">記事を読む<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></span></div>
    </Link>
  </article>
}
