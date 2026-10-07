const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
function load(file, mocks = {}) {
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  new Function('require', 'module', 'exports', code)(name => mocks[name] || require(name), mod, mod.exports)
  return mod.exports
}
const { getFacilitySupport } = load('lib/facility-support.ts')
const now = new Date('2026-10-07T06:00:00Z')
function fixture() {
  return {
    cares_listings: [
      { id: 'a1', owner_facility_id: 'a', is_owner_verified: true },
      { id: 'a2', owner_facility_id: 'a', is_owner_verified: true },
      { id: 'unverified', owner_facility_id: 'a', is_owner_verified: false },
      { id: 'b1', owner_facility_id: 'b', is_owner_verified: true },
    ],
    cares_listing_heart_summary: [
      { listing_id: 'a1', total: '999999999999999999999999999999' }, { listing_id: 'a2', total: '2' },
      { listing_id: 'unverified', total: '999' }, { listing_id: 'b1', total: '999' },
    ],
    cares_guest_heart_requests: [
      { listing_id: 'a1', created_at: '2026-10-01T00:00:00Z' }, { listing_id: 'a2', created_at: '2026-10-07T05:00:00Z' },
      { listing_id: 'a1', created_at: '2026-09-30T05:59:59Z' }, { listing_id: 'a1', created_at: '2026-10-07T06:00:01Z' },
      { listing_id: 'b1', created_at: '2026-10-07T05:00:00Z' }, { listing_id: 'unverified', created_at: '2026-10-07T05:00:00Z' },
    ],
    cares_listing_heart_requests: [{ listing_id: 'a1', created_at: '2026-09-30T06:00:00Z' }],
  }
}
function clientFor(rows, failure) {
  const queries = []
  return { queries, from(table) {
    let selected = rows[table] || [], head = false
    const record = { table }; queries.push(record)
    const builder = {
      select(columns, options) { head = options?.head === true; record.options = options; record.columns = columns; return builder },
      eq(key, value) { selected = selected.filter(row => row[key] === value); return builder },
      in(key, values) { selected = selected.filter(row => values.includes(row[key])); return builder },
      gte(key, value) { selected = selected.filter(row => row[key] >= value); return builder },
      lte(key, value) { selected = selected.filter(row => row[key] <= value); return builder },
      then(resolve, reject) { return Promise.resolve({ data: head ? null : selected, count: head ? selected.length : null, error: failure === table ? { message: 'Private internal detail' } : null }).then(resolve, reject) },
    }
    return builder
  }}
}
test('認証済み連携の事業所だけを精度を落とさず合算し、直近7日間を両方の履歴から集計する', async () => {
  const client = clientFor(fixture())
  assert.deepEqual(await getFacilitySupport(client, 'a', now), { status: 'ready', total: '1000000000000000000000000000001', recent: '3', asOf: now.toISOString() })
  for (const query of client.queries.filter(row => row.table.endsWith('_requests'))) assert.deepEqual(query.options, { count: 'exact', head: true })
})
test('連携なし・正しい0件・取得失敗を区別する', async () => {
  const empty = await getFacilitySupport(clientFor(fixture()), 'missing', now)
  assert.equal(empty.status, 'unlinked'); assert.equal(empty.total, null)
  const rows = fixture(); rows.cares_listing_heart_summary = []; rows.cares_guest_heart_requests = []; rows.cares_listing_heart_requests = []
  assert.deepEqual(await getFacilitySupport(clientFor(rows), 'a', now), { status: 'ready', total: '0', recent: '0', asOf: now.toISOString() })
  for (const table of Object.keys(fixture())) {
    const failed = await getFacilitySupport(clientFor(fixture(), table), 'a', now)
    assert.equal(failed.status, 'unavailable'); assert.equal(failed.total, null); assert.equal(failed.recent, null)
  }
})
test('数値型に変換された累計は正確な値として表示しない', async () => {
  const rows = fixture(); rows.cares_listing_heart_summary[0].total = 9007199254740992
  assert.equal((await getFacilitySupport(clientFor(rows), 'a', now)).status, 'unavailable')
})
test('事業所と編集先を管理URLに保持し、所属済み事業所だけを明示取得時に集計する', async () => {
  const { facilityManagementUrl } = load('lib/cares-navigation.ts')
  const url = new URL(facilityManagementUrl('a', 'fees'))
  assert.equal(url.origin, 'https://app.carespace.jp'); assert.equal(url.searchParams.get('facility_id'), 'a'); assert.equal(url.searchParams.get('cares_section'), 'fees')
  const requested = []
  const route = load('app/api/my-facilities/route.ts', {
    '@/lib/supabase-server-auth': { createAuthServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'verified-user' } } }) } }) },
    '@/lib/supabase': { getSupabaseServiceClient: () => ({}) },
    '@/lib/my-facilities': { getMyFacilities: async () => [{ id: 'assigned' }] },
    '@/lib/facility-support': { getFacilitySupport: async (_client, id) => { requested.push(id); return { status: 'ready', total: '12', recent: '2' } } },
  })
  await route.GET(new Request('https://cares.example/api/my-facilities?facility_id=other'))
  assert.deepEqual(requested, [])
  const response = await route.GET(new Request('https://cares.example/api/my-facilities?engagement=1&facility_id=other'))
  assert.deepEqual(requested, ['assigned']); assert.equal((await response.json()).facilities[0].support.total, '12')
})
test('大きな数は短く表示し、正確な数を開いて確認できる', () => {
  const { compactSupport, default: Component } = load('components/FacilitySupportSummary.tsx')
  assert.equal(compactSupport('12000'), '1.2万')
  assert.equal(compactSupport('100000000'), '1億')
  assert.ok(compactSupport('9'.repeat(80)).length < 20)
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
  const html = renderToStaticMarkup(React.createElement(Component, { support: { status: 'ready', total: '9'.repeat(80), recent: '12', asOf: now.toISOString() } }))
  assert.ok(html.includes('正確な数と集計について')); assert.ok(html.includes('累計 ' + '9'.repeat(80)))
})
test('公開事業所ページはOSの空き状況と従来の値を表示できる', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/facility/[id]/page.tsx'), 'utf8')
  const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let labels
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'acceptanceLabels') labels = new Function('return (' + node.initializer.getText(ast) + ')')()
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(labels.has_vacancy, '空きあり'); assert.equal(labels.no_vacancy, '空きなし'); assert.equal(labels.unknown, '確認中')
  assert.equal(labels.accepting, '受入可能'); assert.equal(labels.not_accepting, '受入停止中')
})
