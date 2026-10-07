const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function load(file, mocks = {}) {
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  new Function('require', 'module', 'exports', code)(name => mocks[name] || require(name), mod, mod.exports)
  return mod.exports
}

function clientFor(rows, failure) {
  const queries = []
  return {
    queries,
    from(table) {
      let selected = rows[table] || []
      const query = { table, filters: [] }
      queries.push(query)
      const builder = {
        select() { return builder },
        eq(key, value) { query.filters.push([key, value]); selected = selected.filter(row => row[key] === value); return builder },
        in(key, values) { query.filters.push([key, values]); selected = selected.filter(row => values.includes(row[key])); return builder },
        order() { return builder },
        maybeSingle() { return Promise.resolve({ data: selected[0] || null, error: failure === table ? { message: 'Unavailable' } : null }) },
        then(resolve, reject) { return Promise.resolve({ data: selected, error: failure === table ? { message: 'Unavailable' } : null }).then(resolve, reject) },
      }
      return builder
    },
  }
}
const support = load('lib/facility-support.ts')
const { getMyFacilities } = load('lib/my-facilities.ts')
const fixture = () => ({
  user_profiles: [{ id: 'os-profile', user_id: 'auth-user', organization_id: 'org-a', is_active: true }],
  user_facility_assignments: [
    { user_id: 'os-profile', facility_id: 'published' },
    { user_id: 'os-profile', facility_id: 'private' },
    { user_id: 'os-profile', facility_id: 'cross-org' },
    { user_id: 'someone-else', facility_id: 'other-staff' },
  ],
  facilities: [
    { id: 'published', organization_id: 'org-a', name: '合成・公開事業所', service_type: '通所介護' },
    { id: 'private', organization_id: 'org-a', name: '合成・非公開事業所', service_type: '訪問介護' },
    { id: 'cross-org', organization_id: 'org-b', name: '別法人の事業所' },
    { id: 'other-staff', organization_id: 'org-a', name: '未所属事業所' },
  ],
  facility_portal_profiles: [
    { facility_id: 'published', organization_id: 'org-a', is_published: true },
    { facility_id: 'private', organization_id: 'org-a', is_published: false },
    { facility_id: 'cross-org', organization_id: 'org-b', is_published: true },
  ],
})

test('本人のOSプロフィール・所属・法人で絞り、未公開URLや他事業所を返さない', async () => {
  const client = clientFor(fixture())
  const result = await getMyFacilities(client, 'auth-user')
  assert.deepEqual(result.map(row => row.id), ['published', 'private'])
  assert.equal(result[0].publicUrl, 'https://cares.carespace.jp/facility/published')
  assert.equal(result[1].publicUrl, null)
  assert.equal(result[1].isPublished, false)
  assert.deepEqual(client.queries[1].filters, [['user_id', 'os-profile']])
})

test('一般利用者・無効化済みのOSアカウントには事業所を返さない', async () => {
  const client = clientFor(fixture())
  assert.deepEqual(await getMyFacilities(client, 'general-user'), [])
  assert.equal(client.queries.length, 1)
  const rows = fixture(); rows.user_profiles[0].is_active = false
  const inactive = clientFor(rows)
  assert.deepEqual(await getMyFacilities(inactive, 'auth-user'), [])
  assert.equal(inactive.queries.length, 1)
})

test('所属や公開設定の取得失敗は空き情報として扱わず、取得失敗にする', async () => {
  for (const table of ['user_profiles', 'user_facility_assignments', 'facilities', 'facility_portal_profiles']) {
    await assert.rejects(getMyFacilities(clientFor(fixture(), table), 'auth-user'))
  }
})

test('OS所属がない場合や公開プロフィール未作成でも共有URLを作らない', async () => {
  const rows = fixture(); rows.user_facility_assignments = []
  assert.deepEqual(await getMyFacilities(clientFor(rows), 'auth-user'), [])
  const missingPortal = fixture(); missingPortal.facility_portal_profiles = []
  assert.equal((await getMyFacilities(clientFor(missingPortal), 'auth-user')).every(row => row.publicUrl === null), true)
})

function routeFor(user, getFacilities) {
  return load('app/api/my-facilities/route.ts', {
    '@/lib/supabase-server-auth': { createAuthServerClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) } }) },
    '@/lib/supabase': { getSupabaseServiceClient: () => ({ synthetic: true }) },
    '@/lib/my-facilities': { getMyFacilities: getFacilities },
    '@/lib/facility-support': support,
  })
}

test('自分の事業所APIは未ログインを拒否しDBを読み出さない', async () => {
  const response = await routeFor(null, () => { throw new Error('Must not query') }).GET(new Request('https://cares.example/api/my-facilities'))
  assert.equal(response.status, 401)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
})

test('自分の事業所APIは認証済みIDだけを利用し、応答は個人キャッシュ不可', async () => {
  let userId
  const response = await routeFor({ id: 'verified-user' }, async (_client, id) => { userId = id; return [] }).GET(new Request('https://cares.example/api/my-facilities'))
  assert.equal(userId, 'verified-user')
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { facilities: [] })
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  const failed = await routeFor({ id: 'verified-user' }, async () => { throw new Error('Private internal details') }).GET(new Request('https://cares.example/api/my-facilities'))
  assert.equal(failed.status, 503)
  assert.equal(JSON.stringify(await failed.json()).includes('Private internal'), false)
})
