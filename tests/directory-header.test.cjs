const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

function load(file, dependencies) {
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  new Function('require', 'module', 'exports', code)(name => name in dependencies ? dependencies[name] : require(name), mod, mod.exports)
  return mod.exports
}

async function renderDirectory({ verified = true, profile = null, profileError = null } = {}) {
  const queried = []
  const listing = { id: 'listing-a', facility_name: 'テスト事業所', is_owner_verified: verified, owner_facility_id: 'facility-a', phone: '000-000-0000', jigyosho_number: '1234567890' }
  const supabase = { from(table) {
    const filters = []
    queried.push({ table, filters })
    const result = () => table === 'cares_listings' ? { data: listing } : table === 'facility_portal_profiles' ? { data: profile, error: profileError } : { data: [], count: 0 }
    const query = {
      select() { return query }, eq(key, value) { filters.push([key, value]); return query },
      order() { return query }, limit() { return query }, single: async () => result(), maybeSingle: async () => result(),
      then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject) },
    }
    return query
  } }
  const element = React.createElement
  const empty = () => null
  const header = load('components/FacilityProfileHeader.tsx', {
    './FacilityHearts': props => element('div', { 'data-heart-listing': props.listingId, 'data-heart-facility': props.facilityId }),
    './AddToListButton': () => null,
    './FacilityOwnerTools': props => element('div', { 'data-owner-tools': props.facilityId }),
    './FacilityProfileShare': props => element('a', { href: props.publicUrl }, '共有'),
    '@/app/facility/[id]/InquiryButton': props => element('button', { 'data-inquiry': props.facilityId }, 'お問い合わせ'),
  }).default
  const page = load('app/directory/[id]/page.tsx', {
    '@/components/FacilityProfileHeader': header,
    '@/components/ProviderIntakeSection': () => element('section', { id: 'apply' }, '空き状況・ご利用の相談'),
    '@/components/FacilityPostFeed': empty,
    '@/lib/profile-media': load('lib/profile-media.ts', {}),
    '@/lib/simulation-tariffs': { simulationTariffs: () => [] },
    '@/lib/vacancies': { getCurrentVacancies: async () => ({}) },
    '@/lib/community': { VACANCY_SOURCES: {} },
    '@/lib/supabase': { getSupabaseClient: () => supabase },
    'next/navigation': { notFound() { throw new Error('not found') } },
    'next/link': ({ children, ...props }) => element('a', props, children),
    '@/components/DirectoryDisclaimer': empty,
    './DirectoryDetailClient': props => element('div', { 'data-extra-hearts': props.showHearts }),
    './EditButton': empty,
    '@/components/FavoriteButton': empty,
    '@/app/facility/[id]/FloatingActions': empty,
    '@/app/facility/[id]/InquiryButton': empty,
    '@/app/facility/[id]/ShareButtons': empty,
    '@/components/BrochureCollection': empty,
  }).default
  const html = renderToStaticMarkup(await page({ params: Promise.resolve({ id: listing.id }), searchParams: Promise.resolve({}) }))
  return { html, queried }
}

function assertIdentityFirst(html) {
  const header = html.indexOf('aria-label="事業所のプロフィール"')
  const name = html.indexOf('<h1')
  const intake = html.indexOf('id="apply"')
  assert.ok(header >= 0 && header < name && name < intake, 'カバーと事業所名が相談案内より先にある')
  assert.equal((html.match(/<h1\b/g) || []).length, 1)
  assert.equal((html.match(/id="apply"/g) || []).length, 1)
  assert.match(html, /data-extra-hearts="false"/)
}

test('確認済みでも公開プロフィールがなければ既定のカバー・アイコンを先頭に表示し、共有と応援は掲載ページを使う', async () => {
  const { html, queried } = await renderDirectory()
  assertIdentityFirst(html)
  assert.match(html, /src="\/images\/facility-cover-home.webp"/)
  assert.match(html, /aria-label="テスト事業所のアイコン"/)
  assert.match(html, /aria-label="事業所公式"/)
  assert.match(html, /href="https:\/\/cares.carespace.jp\/directory\/listing-a"/)
  assert.match(html, /data-heart-listing="listing-a"/)
  assert.doesNotMatch(html, /data-heart-facility|data-inquiry=/)
  assert.match(html, /data-owner-tools="facility-a"/)
  assert.deepEqual(queried.find(row => row.table === 'facility_portal_profiles').filters, [['facility_id', 'facility-a'], ['is_published', true]])
})

test('公開プロフィール取得に失敗しても事業所の表示は維持し、写真取得失敗を知らせる', async () => {
  const { html } = await renderDirectory({ profileError: { message: 'unavailable' } })
  assertIdentityFirst(html)
  assert.match(html, /写真・プロフィールを読み込めませんでした/)
  assert.match(html, /src="\/images\/facility-cover-home.webp"/)
  assert.doesNotMatch(html, /data-heart-facility|data-inquiry=/)
})

test('公開中の写真とアイコン、公式プロフィールへの共有・応援・問い合わせを維持する', async () => {
  const { html } = await renderDirectory({ profile: { cover_image_url: 'https://example.invalid/cover.jpg', icon_url: 'https://example.invalid/icon.jpg', photos: [] } })
  assertIdentityFirst(html)
  assert.match(html, /src="https:\/\/example.invalid\/cover.jpg"/)
  assert.match(html, /src="https:\/\/example.invalid\/icon.jpg"/)
  assert.match(html, /href="https:\/\/cares.carespace.jp\/facility\/facility-a"/)
  assert.match(html, /data-heart-facility="facility-a"/)
  assert.match(html, /data-inquiry="facility-a"/)
})

test('所有確認前の掲載ページでも先頭に事業所を表示し、公式表示や未確認の連携先は使わない', async () => {
  const { html, queried } = await renderDirectory({ verified: false })
  assertIdentityFirst(html)
  assert.match(html, /href="https:\/\/cares.carespace.jp\/directory\/listing-a"/)
  assert.doesNotMatch(html, /aria-label="事業所公式"|data-owner-tools|data-heart-facility|data-inquiry=/)
  assert.equal(queried.some(row => row.table === 'facility_portal_profiles'), false)
})
