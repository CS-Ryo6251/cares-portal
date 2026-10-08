const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), vm = require('node:vm')
const { PGlite } = require('@electric-sql/pglite')
function load(file, mocks = {}) {
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)(name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), mod, mod.exports)
  return mod.exports
}
const types = load('lib/personal-lists.ts'), intake = load('lib/intake.ts')
const security = load('lib/intake-server.ts', { 'server-only': {}, 'next/headers': {}, './supabase': {}, './supabase-server-auth': {}, './intake': intake })
const id = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const entry = n => ({ listing_id: id(n), private_note: `非公開メモ${n}`, public_note: `紹介コメント${n}` })

test('共有情報は内部タイトル・個人メモを含まず、おすすめは共有できない', () => {
  const list = { kind: 'candidates', title: '利用者の内部情報', user_id: id(99), entries: [entry(1), entry(2)] }
  const snapshot = types.listSnapshot(list, '家族へのご紹介', '見学候補です')
  assert.deepEqual(Object.keys(snapshot).sort(), ['entries', 'intro', 'title'])
  assert.deepEqual(snapshot.entries, [{ listing_id: id(1), comment: '紹介コメント1' }, { listing_id: id(2), comment: '紹介コメント2' }])
  assert.doesNotMatch(JSON.stringify(snapshot), /非公開|内部情報|user_id/)
  assert.throws(() => types.listSnapshot({ ...list, kind: 'recommendations' }, '見出し', ''), /非公開/)
  assert.throws(() => types.listSnapshot({ ...list, entries: [] }, '見出し', ''), /追加/)
})
test('件数・重複・長さ・コピー範囲を検証し、紹介コメントを別の利用者へ持ち越さない', () => {
  assert.throws(() => types.listEntries([entry(1), entry(1)]), /重複/)
  assert.throws(() => types.listEntries(Array.from({ length: 31 }, (_, i) => entry(i))), /30/)
  assert.throws(() => types.listEntries([{ ...entry(1), private_note: 'x'.repeat(1001) }]), /1000/)
  assert.deepEqual(types.copiedEntries([entry(1), entry(2)], [id(2)]), [{ ...entry(2), public_note: '' }])
  assert.throws(() => types.copiedEntries([entry(1)], [id(2)]), /変わりました/)
})
test('DBは公開・認証済ユーザーの直接読書きを拒否し、おすすめ公開や共有欄への個人メモ混入を制約で拒否', async () => {
  const db = new PGlite()
  try {
    await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);grant usage on schema public,auth to service_role;grant all on all tables in schema auth to service_role;')
    const filename = fs.readdirSync(path.join(__dirname, '../supabase/migrations')).find(name => name.endsWith('_cares_personal_lists.sql'))
    await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations', filename), 'utf8'))
    await db.query('insert into auth.users values ($1)', [id(99)])
    await db.exec('set role service_role')
    const insert = (n, kind, entries) => db.query('insert into cares_personal_lists(id,user_id,kind,title,entries,request_hash) values($1,$2,$3,$4,$5,$6)', [id(n), id(99), kind, '自分用の名前', JSON.stringify(entries), 'a'.repeat(64)])
    await insert(100, 'candidates', [entry(1)])
    await insert(101, 'recommendations', [entry(2)])
    for (const entries of [[entry(1), entry(1)], [{ ...entry(1), private_note: null }], { item: entry(1) }]) await assert.rejects(insert(102, 'candidates', entries))
    const share = (n, snapshot) => db.query('update cares_personal_lists set share_token=$1, share_snapshot=$2, shared_version=1 where id=$3', ['b'.repeat(64), JSON.stringify(snapshot), id(n)])
    const snapshot = types.listSnapshot({ kind: 'candidates', entries: [entry(1)] }, '公開の見出し', '')
    await assert.rejects(share(101, snapshot), /check constraint/)
    await assert.rejects(share(100, { ...snapshot, private_note: 'leak' }), /check constraint/)
    await assert.rejects(share(100, { ...snapshot, entries: [{ ...snapshot.entries[0], private_note: 'leak' }] }), /check constraint/)
    await share(100, snapshot)
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`reset role;set role ${role}`)
      await assert.rejects(db.query('select * from cares_personal_lists'), /permission denied/)
      await assert.rejects(db.query("delete from cares_personal_lists"), /permission denied/)
    }
  } finally { await db.close() }
})

function harness() {
  let user = id(99), failRead = false, race = false
  const rows = new Map(), catalog = [1, 2, 3].map(n => ({ id: id(n), facility_name: `合成事業所${n}`, service_type: '通所介護', address: '架空の地域', phone: null, is_owner_verified: false }))
  function from(table) {
    const filters = []; let operation = 'select', values, columns = '*', start = 0, end = Infinity
    const builder = {
      select(value) { columns = value; return this }, insert(value) { values = value; operation = 'insert'; return this }, update(value) { values = value; operation = 'update'; return this }, delete() { operation = 'delete'; return this },
      eq(key, value) { filters.push(row => row[key] === value); return this }, in(key, value) { filters.push(row => value.includes(row[key])); return this }, order() { return this }, range(a, b) { start = a; end = b; return this },
      maybeSingle() { return run(true) }, then(resolve, reject) { return run(false).then(resolve, reject) },
    }
    async function run(single) {
      if (failRead) return { data: null, error: { code: 'failure' } }
      if (operation === 'insert') {
        if (rows.has(values.id)) return { data: null, error: { code: '23505' } }
        rows.set(values.id, { version: 1, share_token: null, share_snapshot: null, shared_version: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...values })
        return { data: null, error: null }
      }
      if (race && operation === 'update') { rows.get(values.race_id || id(100)).version++; race = false }
      let found = (table === 'cares_listings' ? catalog : [...rows.values()]).filter(row => filters.every(filter => filter(row))).slice(start, end + 1)
      if (operation === 'update') found.forEach(row => Object.assign(row, values))
      if (operation === 'delete') found.forEach(row => rows.delete(row.id))
      found = found.map(row => structuredClone(columns === '*' ? row : Object.fromEntries(columns.split(',').map(key => [key, row[key]]))))
      return { data: single ? found[0] || null : found, error: null }
    }
    return builder
  }
  const db = { from }, safe = { ...security, takeLimit: async () => {} }
  const server = load('lib/personal-lists-server.ts', {
    'server-only': {}, './personal-lists': types, './intake-server': safe,
    './supabase': { getSupabaseServiceClient: () => db, getSupabaseClient: () => db },
    './supabase-server-auth': { createAuthServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: user ? { id: user } : null }, error: null }) } }) },
    './directory-profiles': { getDirectoryProfiles: async () => ({}), directoryProfile: () => undefined }, './profile-media': { publicWebUrl: value => value || null },
  })
  const mocks = { '@/lib/personal-lists': types, '@/lib/personal-lists-server': server, '@/lib/intake-server': safe, '@/lib/supabase': { getSupabaseServiceClient: () => db } }
  return { rows, server, user: value => { user = value }, fail: value => { failRead = value }, race: () => { race = true }, all: load('app/api/my-lists/route.ts', mocks), item: load('app/api/my-lists/[id]/route.ts', mocks), shared: load('app/api/shared-lists/[token]/route.ts', mocks) }
}
const request = (method = 'GET', body, origin = 'https://cares.example') => new Request('https://cares.example/api/my-lists', { method, headers: { origin, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
const context = n => ({ params: Promise.resolve({ id: id(n) }) })
const create = (h, n = 100, kind = 'candidates') => h.all.POST(request('POST', { id: id(n), title: '内部専用の利用者名', kind, listing_id: id(1), user_id: id(98), share_token: 'evil' }))
const patch = (h, body, n = 100) => h.item.PATCH(request('PATCH', body), context(n))

test('APIは認証・Origin・所有権を検証し、IDを知る別ユーザーでも読取・更新・削除・コピーできない', async () => {
  const h = harness(); h.user(null)
  assert.equal((await h.all.GET(request())).status, 401); assert.equal((await create(h)).status, 401)
  h.user(id(99)); assert.equal((await h.all.POST(request('POST', {}, 'https://evil.example'))).status, 403)
  assert.equal((await create(h)).status, 201); assert.equal(h.rows.get(id(100)).user_id, id(99)); assert.equal(h.rows.get(id(100)).share_token, null)
  h.user(id(98))
  assert.deepEqual((await (await h.all.GET(request())).json()).lists, [])
  assert.equal((await h.item.GET(request(), context(100))).status, 404)
  assert.equal((await patch(h, { action: 'save', version: 1, title: 'hijack', entries: [] })).status, 404)
  assert.equal((await h.item.DELETE(request('DELETE', { version: 1 }), context(100))).status, 404)
  assert.equal((await h.all.POST(request('POST', { id: id(101), kind: 'candidates', title: 'copy', source_id: id(100), selected_ids: [id(1)] }))).status, 404)
  assert.equal(h.rows.size, 1)
})
test('作成・追加の再試行は重複せず、古い保存・同時保存・削除は新しい内容を上書きしない', async () => {
  const h = harness(); await create(h)
  assert.equal((await create(h)).status, 200); assert.equal(h.rows.size, 1)
  assert.equal((await patch(h, { action: 'add', listing_id: id(2), version: 1 })).status, 200)
  assert.equal((await patch(h, { action: 'add', listing_id: id(2), version: 1 })).status, 200)
  assert.equal(h.rows.get(id(100)).entries.length, 2)
  const edit = { action: 'save', title: '変更', entries: [entry(2), entry(1)] }
  assert.equal((await patch(h, { ...edit, version: 1 })).status, 409)
  h.race(); assert.equal((await patch(h, { ...edit, version: 2 })).status, 409)
  assert.deepEqual(h.rows.get(id(100)).entries.map(item => item.listing_id), [id(1), id(2)])
  assert.equal((await h.item.DELETE(request('DELETE', { version: 1 }), context(100))).status, 409)
  assert.equal((await patch(h, { ...edit, version: 3 })).status, 200)
  assert.deepEqual(h.rows.get(id(100)).entries.map(item => item.listing_id), [id(2), id(1)])
})
test('共有APIは公開用スナップショットだけを返し、後の私用編集・共有停止・再発行を正しく分離する', async () => {
  const h = harness(); await create(h)
  await patch(h, { action: 'save', version: 1, title: '内部利用者名', entries: [entry(1)] })
  assert.equal((await patch(h, { action: 'share', version: 2, title: '見学候補', intro: 'ご覧ください', private_note: 'inject' })).status, 200)
  const token = h.rows.get(id(100)).share_token
  const read = value => h.shared.GET(request(), { params: Promise.resolve({ token: value }) })
  h.user(null)
  const published = await read(token); assert.equal(published.status, 200)
  const content = await published.text(); assert.match(content, /紹介コメント1/); assert.doesNotMatch(content, /非公開|内部利用者名|user_id|private_note|share_token|inject/)
  assert.match(published.headers.get('cache-control'), /no-store/)
  h.user(id(99)); await patch(h, { action: 'save', version: 3, title: '別の私用名', entries: [entry(2)] })
  assert.match(await (await read(token)).text(), /紹介コメント1/)
  await patch(h, { action: 'unshare', version: 4 })
  assert.equal((await read(token)).status, 404)
  await patch(h, { action: 'share', version: 5, title: '更新した候補', intro: '' })
  assert.notEqual(h.rows.get(id(100)).share_token, token); assert.equal((await read(token)).status, 404)
  assert.equal((await read('bad-token')).status, 404)
})
test('おすすめは非公開を維持し、選択した事業所のみ別の候補グループにコピーする', async () => {
  const h = harness(); await create(h, 100, 'recommendations')
  await patch(h, { action: 'save', version: 1, title: 'おすすめ', entries: [entry(2), entry(1)] })
  assert.equal((await patch(h, { action: 'share', version: 2, title: '公開', intro: '' })).status, 400)
  assert.equal((await h.all.POST(request('POST', { id: id(101), kind: 'candidates', title: '別の利用者', source_id: id(100), selected_ids: [id(1)] }))).status, 201)
  assert.deepEqual(h.rows.get(id(101)).entries, [{ ...entry(1), public_note: '' }])
  assert.equal(h.rows.get(id(101)).share_token, null)
  assert.equal(h.rows.get(id(100)).entries.length, 2)
})
test('取得障害は空のリストと扱わず503にし、30件超・不正事業所を保存しない', async () => {
  const h = harness(); await create(h)
  assert.equal((await patch(h, { action: 'save', version: 1, title: '変更', entries: Array.from({ length: 31 }, (_, i) => entry(i)) })).status, 400)
  assert.equal((await patch(h, { action: 'add', version: 1, listing_id: id(900) })).status, 409)
  h.fail(true)
  assert.equal((await h.all.GET(request())).status, 503)
  assert.equal((await h.item.GET(request(), context(100))).status, 503)
})
test('共有トークン・個人管理画面をAnalyticsに送らず、通常ページの計測を維持', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/layout.tsx'), 'utf8')
  const raw = source.match(/__html: `([^`]+)`/)[1]
  const code = new Function('gaId', 'return `' + raw + '`')('G-TEST')
  for (const pathname of ['/shortlists/' + 'a'.repeat(64), '/my-actions', '/']) {
    const scripts = [], context = { location: { pathname }, document: { referrer: '', createElement: () => ({}), head: { appendChild: node => scripts.push(node) } }, window: {} }
    context.window = context
    vm.runInNewContext(code, context)
    assert.equal(scripts.length, pathname === '/' ? 1 : 0)
  }
})
