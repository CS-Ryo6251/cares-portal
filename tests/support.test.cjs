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
const now = new Date('2026-10-07T06:00:00Z')
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
  assert.ok(html.includes('正確な数と集計について')); assert.ok(html.includes('合計 ' + '9'.repeat(80)))
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
