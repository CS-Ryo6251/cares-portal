const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const { NextRequest } = require('next/server')
function load(file, mocks = {}) {
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(name => mocks[name] || (name.startsWith('@/lib/') ? load(`lib/${name.slice(6)}.ts`, mocks) : name.startsWith('.') ? load(path.join(path.dirname(file), name + '.ts'), mocks) : require(name)), mod, mod.exports)
  return mod.exports
}

test('地図: 47都道府県に欠落・重複・重なりがなく、すべて選択できる', () => {
  const { prefectures } = load('lib/constants.ts')
  const { prefectureTiles, mapRegions } = load('lib/prefecture-map.ts')
  assert.equal(prefectureTiles.length, 47)
  assert.deepEqual([...new Set(prefectureTiles.map(tile => tile.prefecture))].sort(), [...prefectures].sort())
  for (const a of prefectureTiles) {
    assert.ok(mapRegions[a.region])
    assert.ok(a.width > 0 && a.height > 0 && a.x >= 0 && a.y >= 0 && a.x + a.width <= 13 && a.y + a.height <= 11.5)
    for (const b of prefectureTiles) if (a !== b) {
      assert.ok(a.x >= b.x + b.width || a.x + a.width <= b.x || a.y >= b.y + b.height || a.y + a.height <= b.y, `${a.prefecture} overlaps ${b.prefecture}`)
    }
  }
})

test('県のプレビューAPI: 地域別集計・上位3件・同順位・大きな数字・失敗を区別', async () => {
  let calls = 0, filters, ranking = { period: 'all', asOf: '2026-10-07T12:00:00Z', periodStart: null, items: [1, 1, 3, 4].map((rank, i) => ({ id: String(i), rank, total: '999999999999999999999' })) }
  const route = load('app/api/ranking/prefecture/route.ts', { '@/lib/support-ranking-server': { getSupportRanking: async f => { calls++; filters = f; return ranking } } })
  const request = query => new NextRequest('https://cares.test/api/ranking/prefecture?' + new URLSearchParams(query))
  const response = await route.GET(request({ period: 'all', prefecture: '山形県', service_type: '通所介護' }))
  assert.equal(response.status, 200)
  assert.deepEqual(filters, { period: 'all', prefecture: '山形県', service: '通所介護' })
  const body = await response.json()
  assert.equal(body.prefecture, '山形県')
  assert.deepEqual(body.items.map(item => item.rank), [1, 1, 3])
  assert.equal(body.items[0].total, '999999999999999999999')
  assert.match(response.headers.get('cache-control'), /s-maxage=60/)
  for (const query of [{}, { prefecture: '全国' }, { prefecture: '山形県', period: 'bad' }, { prefecture: '山形県', service_type: '__proto__' }]) {
    assert.equal((await route.GET(request(query))).status, 400)
  }
  assert.equal(calls, 1)
  ranking = { ...ranking, items: [] }
  const empty = await route.GET(request({ prefecture: '沖縄県' }))
  assert.equal(empty.status, 200); assert.deepEqual((await empty.json()).items, [])
  ranking = null
  const error = await route.GET(request({ prefecture: '北海道' }))
  assert.equal(error.status, 503); assert.equal(error.headers.get('cache-control'), 'no-store')
  assert.equal((await error.json()).items, undefined)
})
