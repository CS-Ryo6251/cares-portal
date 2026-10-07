const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const root = process.cwd()
const cache = new Map()
function load(file) {
  file = path.resolve(root, file)
  if (cache.has(file)) return cache.get(file)
  const loaded = { exports: {} }
  const localRequire = (name) => {
    if (name === 'next/navigation') return { notFound: () => { throw new Error('NOT_FOUND') } }
    if (name === 'next/link') return function TestLink({ children, ...props }) { return React.createElement('a', props, children) }
    if (name === 'next/image') return function TestImage(props) { const attributes = { ...props }; delete attributes.fill; delete attributes.priority; return React.createElement('img', attributes) }
    if (name.startsWith('@/')) {
      const relative = name.slice(2)
      if (relative.endsWith('.json')) return require(path.join(root, relative))
      return load(relative + (fs.existsSync(path.join(root, relative + '.ts')) ? '.ts' : '.tsx'))
    }
    return require(name)
  }
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('module', 'exports', 'require', output)(loaded, loaded.exports, localRequire)
  cache.set(file, loaded.exports)
  return loaded.exports
}
const blog = load('lib/blog.ts')
const index = load('app/blog/page.tsx')
const detail = load('app/blog/[slug]/page.tsx')

test('30 complete articles, valid sources, images and distinct original/Cares dates', () => {
  assert.equal(blog.blogPosts.length, 30)
  assert.equal(new Set(blog.blogPosts.map(p => p.slug)).size, 30)
  assert.equal(blog.blogPosts.filter(p => p.original).length, 6)
  for (const cat of blog.blogCategories) assert.equal(blog.blogPosts.filter(p => p.category === cat.id).length, 6)
  for (const post of blog.blogPosts) {
    assert.match(post.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    assert.ok(post.description.length <= 160)
    assert.ok(post.sections.length >= 4)
    assert.ok(post.sections.map(s => [...s.body, ...(s.bullets || [])].join('')).join('').length >= 650, post.slug)
    assert.ok(post.takeaway.length > 10)
    assert.ok(post.sources.length || post.original)
    assert.equal(new Set(post.sections.map(s => s.heading)).size, post.sections.length)
    assert.ok(fs.statSync(path.join(root, 'public', blog.getBlogImage(post))).size > 1000)
    assert.ok(post.publishedAt <= post.updatedAt && post.updatedAt === post.reviewedAt)
    for (const source of post.sources) assert.ok(new URL(source.url).hostname.endsWith('mhlw.go.jp'))
    if (post.original) assert.ok(post.original.publishedAt < post.publishedAt)
  }
  for (const slug of ['how-to-check-care-vacancy', 'care-service-cost-basics', 'what-care-managers-check']) assert.equal(blog.getBlogPost(slug).publishedAt, '2026-07-12')
})
test('search combines normalized words across full article text and category', () => {
  const result = blog.getBlogLibrary({ q: '　ＦＡＸ　引き継いだ　' })
  assert.ok(result.posts.some(p => p.slug === 'care-contact-handover'))
  assert.equal(blog.getBlogLibrary({ q: '存在しない検索語xyz' }).total, 0)
  const fees = blog.getBlogLibrary({ category: 'costs', q: '食費' })
  assert.ok(fees.total > 0)
  assert.ok(fees.posts.every(p => p.category === 'costs'))
})
test('archive uses source years; invalid filters and page numbers stay usable', () => {
  assert.equal(blog.getBlogLibrary({ year: '2024' }).posts[0].slug, 'care-information-sharing-basics')
  assert.equal(blog.getBlogLibrary({ year: '2025' }).total, 2)
  assert.equal(blog.getBlogLibrary({ sort: 'oldest' }).posts[0].slug, 'care-information-sharing-basics')
  for (const page of ['-1', 'NaN', 'Infinity', '1.2', '0']) assert.equal(blog.getBlogLibrary({ page }).page, 1)
  assert.equal(blog.getBlogLibrary({ page: '999' }).page, 4)
  assert.equal(blog.getBlogLibrary({ category: 'bogus', year: '1900' }).total, 30)
  assert.equal(blog.getBlogLibrary({ category: 'costs', page: '4' }).page, 1)
  const all = Array.from({ length: 4 }, (_, i) => blog.getBlogLibrary({ page: String(i + 1) }).posts).flat()
  assert.equal(new Set(all.map(p => p.slug)).size, 30)
})
test('filter URLs retain the chosen conditions but reset pagination', () => {
  const url = new URL(blog.blogLibraryHref({ q: '家族 費用', category: 'costs', year: '2026', sort: 'oldest' }), 'https://cares.carespace.jp')
  assert.equal(url.searchParams.get('q'), '家族 費用')
  assert.equal(url.searchParams.get('category'), 'costs')
  assert.equal(url.searchParams.has('page'), false)
  assert.equal(url.hash, '#articles')
})
test('related articles do not repeat the current article; dates are timezone-stable', () => {
  for (const post of blog.blogPosts) {
    const related = blog.getRelatedPosts(post)
    assert.equal(related.length, 3)
    assert.ok(related.every(p => p.slug !== post.slug && p.category === post.category))
  }
  assert.equal(blog.formatBlogDate('2026-10-07'), '2026.10.07')
})
test('index renders real filter forms, zero-result recovery and correct page counts', async () => {
  const html = renderToStaticMarkup(await index.default({ searchParams: Promise.resolve({}) }))
  assert.equal((html.match(/<h1/g) || []).length, 1)
  assert.equal((html.match(/<article/g) || []).length, 9)
  assert.match(html, /role="search"/)
  assert.match(html, /name="year"/)
  const page2 = renderToStaticMarkup(await index.default({ searchParams: Promise.resolve({ page: '2' }) }))
  assert.doesNotMatch(page2, /EDITOR/)
  const empty = renderToStaticMarkup(await index.default({ searchParams: Promise.resolve({ q: 'xxxxx不存在' }) }))
  assert.match(empty, /条件に合う記事が見つかりませんでした/)
  assert.match(empty, /すべての記事を見る/)
})
test('every article renders with working TOC, source provenance and matching SEO dates', async () => {
  assert.equal(detail.generateStaticParams().length, 30)
  for (const post of blog.blogPosts) {
    const props = { params: Promise.resolve({ slug: post.slug }) }
    const html = renderToStaticMarkup(await detail.default(props))
    assert.equal((html.match(/<h1/g) || []).length, 1, post.slug)
    for (let n = 1; n <= post.sections.length; n++) assert.ok(html.includes(`id="section-${n}"`) && html.includes(`href="#section-${n}"`))
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1])
    assert.equal(ld[0].datePublished, post.publishedAt)
    if (post.original) assert.equal(ld[0].isBasedOn.datePublished, post.original.publishedAt)
    const metadata = await detail.generateMetadata(props)
    assert.equal(metadata.openGraph.publishedTime, post.publishedAt)
    assert.ok(metadata.openGraph.images[0].url.endsWith('.webp'))
  }
  await assert.rejects(detail.default({ params: Promise.resolve({ slug: 'not-a-real-post' }) }), /NOT_FOUND/)
})
test('filtered archive pages are not indexed; main archive is canonical', async () => {
  assert.equal((await index.generateMetadata({ searchParams: Promise.resolve({ q: '費用' }) })).robots.index, false)
  assert.equal((await index.generateMetadata({ searchParams: Promise.resolve({}) })).alternates.canonical, 'https://cares.carespace.jp/blog')
})
