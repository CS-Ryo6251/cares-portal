const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
function load(file, mocks = {}) {
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (Object.hasOwn(mocks, name)) return mocks[name]
    const base = name.startsWith('@/') ? name.slice(2) : name.startsWith('.') ? path.join(path.dirname(file), name) : null
    if (!base) return require(name)
    return load(base + (fs.existsSync(path.join(__dirname, '..', base + '.tsx')) ? '.tsx' : '.ts'), mocks)
  }, mod, mod.exports)
  return mod.exports
}

test('座標なし・一部欠落・無効座標のWAM事業所も有限の位置で描画され、既存座標を壊さない', () => {
  for (const coordinates of [{ latitude: null, longitude: null }, {}, { latitude: 35, longitude: null }, { latitude: NaN, longitude: Infinity }, { latitude: 35.7, longitude: 139.7 }]) {
    const points = []
    const SpyComponent = load('components/FacilityMapPreview.tsx', {
      react: { ...React, useMemo: fn => { const result = fn(); if (Array.isArray(result) && result[0] && 'lat' in result[0]) points.push(...result); return result } },
      'next/navigation': { useRouter: () => ({}), useSearchParams: () => new URLSearchParams() },
    }).default
    const props = { facilities: [{ id: 'synthetic-wam', facility_name: '合成事業所', service_type: '生活介護', address: '徳島県', source_kind: 'welfare', acceptance_status: null, is_owner_verified: false, heart_total: null, ...coordinates }] }
    const html = renderToStaticMarkup(React.createElement(SpyComponent, props))
    assert.equal(points.length, 1)
    assert(points.every(point => [point.lat, point.lng, point.x, point.y].every(Number.isFinite)))
    assert.doesNotMatch(html, /NaN|Infinity/)
    assert.match(html, /合成事業所/)
    if (coordinates.latitude === 35.7) { assert.equal(points[0].lat, 35.7); assert.equal(points[0].lng, 139.7) }
  }
})

test('ディレクトリAPIは大量データの全件集計を避け、概数を明示し制度フィルターを維持する', async () => {
  let countMode, filter
  const query = { select: (_, options) => { countMode = options.count; return query }, or: value => { filter = value; return query }, order: () => query, range: async () => ({ data: [], error: null, count: countMode === 'exact' ? 216638 : 226147 }) }
  const route = load('app/api/directory/route.ts', {
    '@/lib/supabase': { getSupabaseClient: () => ({ from: () => query }) },
    '@/lib/hearts': { getHeartSummaries: async () => ({}) },
    '@/lib/vacancies': { getCurrentVacancies: async () => ({}) },
    '@/lib/provider-availability': { getListingAvailability: async () => ({}) },
  })
  const response = await route.GET(new Request('https://cares.test/api/directory?scheme=welfare&limit=50'))
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.total, 226147); assert.equal(body.totalPages, 4523); assert.equal(body.totalIsEstimate, true)
  assert.match(filter, /source_kind.eq.welfare/)
})

test('福祉の登録71種別すべてがOS共通の専用ピンを持ち、地図と一覧へ描画される', () => {
  const { WELFARE_MAP_PINS, getWelfareMapPin } = load('lib/welfare-map-pins.ts')
  const Icon = load('components/ServiceTypeIcon.tsx').default
  const MapPreview = load('components/FacilityMapPreview.tsx', { 'next/navigation': { useRouter: () => ({}), useSearchParams: () => new URLSearchParams() } }).default
  assert.equal(WELFARE_MAP_PINS.length, 71)
  assert.equal(new Set(WELFARE_MAP_PINS.map(pin => pin.glyph)).size, 71)
  for (const pin of WELFARE_MAP_PINS) {
    const icon = renderToStaticMarkup(React.createElement(Icon, { serviceType: pin.label }))
    const map = renderToStaticMarkup(React.createElement(MapPreview, { facilities: [{ id: 'synthetic', facility_name: '合成事業所', service_type: pin.label, address: '山形県山形市', latitude: 38.25, longitude: 140.34 }] }))
    assert(icon.includes(pin.glyph), pin.label)
    assert(map.includes(pin.glyph), pin.label)
    assert(map.includes(pin.color), pin.label)
  }
  assert.equal(getWelfareMapPin('就労継続支援Ｂ型').glyph, '就B')
  assert.equal(getWelfareMapPin('居宅介護支援'), null)
})
