import gettingStarted from '@/content/blog/getting-started.json'
import choosingCare from '@/content/blog/choosing-care.json'
import costs from '@/content/blog/costs.json'
import familyLife from '@/content/blog/family-life.json'
import forProfessionals from '@/content/blog/for-professionals.json'
export const blogCategories = [
  { id: 'getting-started', label: 'はじめての介護', imageAlt: '本人と家族が支援者に相談するイラスト' },
  { id: 'choosing-care', label: '事業所選び', imageAlt: '庭のある介護事業所を訪れる人たちのイラスト' },
  { id: 'costs', label: '費用と制度', imageAlt: '家計のノートと電卓を置いた机のイラスト' },
  { id: 'family-life', label: '家族と暮らし', imageAlt: '自宅で家族とお茶を囲む時間のイラスト' },
  { id: 'for-professionals', label: '専門職のヒント', imageAlt: '介護の専門職がテーブルを囲んで相談するイラスト' },
] as const
export type BlogCategory = (typeof blogCategories)[number]['id']
export type BlogSection = { heading: string; body: string[]; bullets?: string[] }
export type BlogSource = { title: string; url: string }
export type BlogPost = {
  slug: string; title: string; description: string; category: BlogCategory
  publishedAt: string; updatedAt: string; reviewedAt: string; readingMinutes: number
  author: string; tags: string[]; takeaway: string; sections: BlogSection[]; sources: BlogSource[]
  original?: BlogSource & { publishedAt: string; publisher: string }
}
const collections = [gettingStarted, choosingCare, costs, familyLife, forProfessionals]
const rawPosts = Array.from({ length: Math.max(...collections.map((posts) => posts.length)) }, (_, index) => collections.flatMap((posts) => posts[index] ? [posts[index]] : [])).flat()
export const blogPosts: BlogPost[] = rawPosts.map((post) => {
  const category = blogCategories.find((item) => item.id === post.category)
  if (!category) throw new Error(`Unknown blog category: ${post.category}`)
  const characters = post.sections.reduce((sum, section) => sum + section.heading.length + section.body.join('').length + section.bullets.join('').length, 0)
  return { ...post, category: category.id, readingMinutes: Math.max(2, Math.ceil(characters / 500)) }
})
export function getBlogCategory(id: BlogCategory) { return blogCategories.find((category) => category.id === id)! }
export function getBlogImage(post: Pick<BlogPost, 'category'>) { return `/images/blog/${post.category}.webp` }
// Source chronology is kept separate from Cares publication.
export function getArchiveDate(post: BlogPost) { return post.original?.publishedAt || post.publishedAt }
export function getBlogPosts() { return [...blogPosts].sort((a, b) => getArchiveDate(b).localeCompare(getArchiveDate(a))) }
export function getBlogPost(slug: string) { return blogPosts.find((post) => post.slug === slug) || null }
export function getRelatedPosts(current: BlogPost) {
  return getBlogPosts().filter((post) => post.slug !== current.slug)
    .map((post, index) => ({ post, index, score: (post.category === current.category ? 3 : 0) + post.tags.filter((tag) => current.tags.includes(tag)).length }))
    .sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 3).map(({ post }) => post)
}
export function formatBlogDate(date: string) {
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Tokyo' }).format(new Date(`${date}T00:00:00+09:00`)).replaceAll('/', '.')
}
export type BlogFilters = { q?: string; category?: string; year?: string; sort?: string; page?: string }
export const BLOG_PAGE_SIZE = 9
export function getBlogLibrary(filters: BlogFilters = {}) {
  const normalize = (text: string) => text.normalize('NFKC').toLocaleLowerCase('ja-JP')
  const q = (filters.q || '').trim().slice(0, 200)
  const terms = normalize(q).split(/\s+/).filter(Boolean)
  const category = blogCategories.some((item) => item.id === filters.category) ? filters.category! : ''
  const years = [...new Set(blogPosts.map((post) => getArchiveDate(post).slice(0, 4)))].sort().reverse()
  const year = years.includes(filters.year || '') ? filters.year! : ''
  const sort = filters.sort === 'oldest' ? 'oldest' : 'newest'
  let matches = getBlogPosts().filter((post) => (!category || post.category === category) && (!year || getArchiveDate(post).startsWith(year)))
  if (terms.length) matches = matches.filter((post) => {
    const searchable = normalize([post.title, post.description, post.takeaway, getBlogCategory(post.category).label, ...post.tags, ...post.sections.flatMap((section) => [section.heading, ...section.body, ...(section.bullets || [])])].join(' '))
    return terms.every((term) => searchable.includes(term))
  })
  if (sort === 'oldest') matches.reverse()
  const totalPages = Math.max(1, Math.ceil(matches.length / BLOG_PAGE_SIZE))
  const requested = Number(filters.page)
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, totalPages) : 1
  return { posts: matches.slice((page - 1) * BLOG_PAGE_SIZE, page * BLOG_PAGE_SIZE), total: matches.length, totalPages, page, years, q, category, year, sort }
}
export function blogLibraryHref(filters: BlogFilters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value && !(key === 'page' && value === '1') && !(key === 'sort' && value === 'newest')) params.set(key, value)
  return `/blog${params.size ? `?${params}` : ''}#articles`
}
