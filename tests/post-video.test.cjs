const { test } = require('node:test'), assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
const { PGlite } = require('@electric-sql/pglite')
const root = path.join(__dirname, '..')
function load(file, mocks = {}) {
  const mod = { exports: {} }
  const req = name => Object.hasOwn(mocks, name) ? mocks[name] : name.startsWith('.') ? load(path.join(path.dirname(file), name + '.tsx'), mocks) : require(name)
  new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText)(req, mod, mod.exports)
  return mod.exports
}
test('public video uses native controls, inline playback and metadata preload without autoplay', () => {
  const Video = load('components/PostVideo.tsx').default
  const html = renderToStaticMarkup(React.createElement(Video, { src: 'https://example.invalid/test.mp4' }))
  assert.match(html, /<video/); assert.match(html, /controls=""/); assert.match(html, /playsInline=""/); assert.match(html, /preload="metadata"/)
  assert.doesNotMatch(html, /autoPlay|<img/)
})
test('home feed renders video first and makes later mixed media selectable', () => {
  const Card = load('components/PostCard.tsx', { './CommentSection': { default: () => null }, './ServiceTypeIcon': { default: () => null }, '@/lib/constants': { facilityTypeLabels: {}, vacancyStatusMap: { unknown: {} }, postCategoryLabels: {}, formatRelativeDate: () => '今日' } }).default
  const post = { id: 'p', content: '合成投稿', created_at: '2026-11-19', facility_portal_post_media: [
    { id: 'v', media_url: 'https://example.invalid/test.mp4', media_type: 'video/mp4', sort_order: 0 },
    { id: 'i', media_url: 'https://example.invalid/test.jpg', media_type: 'image/jpeg', sort_order: 1 },
  ] }
  const html = renderToStaticMarkup(React.createElement(Card, { post, facility: { name: '合成事業所' }, acceptanceStatus: 'unknown' }))
  assert.match(html, /<video/); assert.match(html, /2件目の写真を見る/)
  assert.doesNotMatch(html, /<img[^>]+test.mp4/)
})
test('PostgreSQL: atomic media, retry idempotence, owner isolation and service-only grants', async () => {
  const db = new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table public.facility_portal_posts (id uuid primary key, facility_id uuid not null, profile_id uuid not null, user_id uuid not null, content text not null, title text, post_type text, category text, link_url text, acceptance_status_at_post text constraint facility_portal_posts_acceptance_status_at_post_check check (acceptance_status_at_post in ('accepting','conditional','full','paused')), status text);
      create table public.facility_portal_post_media (id uuid default gen_random_uuid(), post_id uuid references public.facility_portal_posts, media_url text not null, media_type text, sort_order integer);
      grant all on public.facility_portal_posts, public.facility_portal_post_media to service_role;`)
    const migration = fs.readdirSync(path.join(root, 'supabase/migrations')).find(name => name.endsWith('_cares_direct_media_post.sql'))
    await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations', migration), 'utf8'))
    const id = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`
    const post = { id: id(1), facility_id: id(2), profile_id: id(3), user_id: id(4), content: '合成投稿', acceptance_status_at_post: 'unknown', status: 'published' }
    const media = [{ media_url: 'https://example.invalid/movie.mp4', media_type: 'video/mp4' }, { media_url: 'https://example.invalid/photo.jpg', media_type: 'image/jpeg' }]
    const call = (p = post, m = media) => db.query('select public.create_cares_media_post($1,$2) as post', [JSON.stringify(p), JSON.stringify(m)])
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`)
      await assert.rejects(call(), /permission denied/)
      await db.exec('reset role')
    }
    await db.exec('set role service_role')
    const first = (await call()).rows[0].post
    assert.deepEqual(first.facility_portal_post_media.map(m => m.sort_order), [0, 1])
    assert.deepEqual((await call()).rows[0].post, first)
    await assert.rejects(call({ ...post, user_id: id(5) }), /owner mismatch/)
    await assert.rejects(call({ ...post, id: id(6) }, [{ media_url: null }]), /not-null constraint/)
    assert.equal((await db.query('select count(*)::int as n from public.facility_portal_posts')).rows[0].n, 1)
    assert.equal((await db.query('select count(*)::int as n from public.facility_portal_post_media')).rows[0].n, 2)
  } finally { await db.close() }
})
