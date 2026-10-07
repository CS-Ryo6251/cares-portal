const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const fid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const pid = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', lid = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
function fixture() {
  const rows = {
    facility_portal_profiles: [{ facility_id: fid, is_published: true, facilities: { id: fid, name: '合成事業所' } }],
    facility_portal_posts: [{ id: pid, facility_id: fid, status: 'published', title: '昔の公開投稿', content: '合成の本文', created_at: '2020-01-01' }],
    cares_listings: [{ id: lid, owner_facility_id: fid, is_owner_verified: true }],
  }
  const calls = []; let failedTable = ''
  const client = { from(table) {
    calls.push(table); const filters = []; let single = false
    const execute = () => ({ data: failedTable === table ? null : single ? rows[table].find(row => filters.every(([key, value]) => row[key] === value)) || null : rows[table].filter(row => filters.every(([key, value]) => row[key] === value)), error: failedTable === table ? { message: 'Synthetic outage' } : null })
    const query = { select() { return query }, eq(key, value) { filters.push([key, value]); return query }, order() { return query }, limit() { return query }, maybeSingle() { single = true; return Promise.resolve(execute()) }, then(resolve) { return Promise.resolve(execute()).then(resolve) } }
    return query
  } }
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/public-post.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  new Function('require', 'module', 'exports', code)(name => name === './supabase' ? { getSupabaseClient: () => client } : { UUID_PATTERN: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i }, mod, mod.exports)
  return { load: mod.exports.getPublicPost, rows, calls, fail: table => { failedTable = table } }
}
test('共有URLは古い公開投稿も直接取得し、認証済みの同じ事業所に応援を送る', async () => {
  const f = fixture(); f.rows.cares_listings.unshift({ id: other, owner_facility_id: other, is_owner_verified: true }, { id: other, owner_facility_id: fid, is_owner_verified: false })
  const data = await f.load(fid, pid)
  assert.equal(data.post.title, '昔の公開投稿'); assert.equal(data.listingId, lid); assert.equal(data.facility.name, '合成事業所')
})
test('不正ID、非公開の事業所・投稿、別事業所の投稿は共有URLでも表示しない', async () => {
  let f = fixture(); assert.equal(await f.load('bad', pid), null); assert.deepEqual(f.calls, [])
  f = fixture(); assert.equal(await f.load(fid, 'bad'), null); assert.deepEqual(f.calls, [])
  f = fixture(); f.rows.facility_portal_profiles[0].is_published = false; assert.equal(await f.load(fid, pid), null); assert.deepEqual(f.calls, ['facility_portal_profiles'])
  f = fixture(); f.rows.facility_portal_posts[0].status = 'draft'; assert.equal(await f.load(fid, pid), null)
  f = fixture(); f.rows.facility_portal_posts[0].facility_id = other; assert.equal(await f.load(fid, pid), null)
  f = fixture(); f.rows.facility_portal_posts = []; assert.equal(await f.load(fid, pid), null)
})
test('応援先未連携と読込障害を区別し、障害を投稿なしと扱わない', async () => {
  const f = fixture(); f.rows.cares_listings = []; assert.equal((await f.load(fid, pid)).listingId, undefined)
  for (const table of ['facility_portal_profiles', 'facility_portal_posts', 'cares_listings']) { const broken = fixture(); broken.fail(table); await assert.rejects(() => broken.load(fid, pid)) }
})
