const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const mod = { exports: {} }
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/profile-media.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
new Function('module', 'exports', code)(mod, mod.exports)
const { publicWebUrl, postMedia, profilePhotos, postCategory } = mod.exports
const post = { id: 'p', content: '合成データ', created_at: '2026-10-07T00:00:00Z' }
test('複数写真を登録順に並べ、動画を区別し、原本を変更しない', () => {
 const media = [{ id: 'b', media_url: 'https://example.invalid/movie.mp4', media_type: 'video/mp4', sort_order: 2 }, { id: 'a', media_url: 'https://example.invalid/photo.jpg', media_type: 'image', sort_order: 1 }]
 assert.deepEqual(postMedia({ ...post, facility_portal_post_media: media }), [{ id: 'a', url: 'https://example.invalid/photo.jpg', type: 'image' }, { id: 'b', url: 'https://example.invalid/movie.mp4', type: 'video' }])
 assert.deepEqual(media.map(row => row.id), ['b', 'a'])
})
test('従来の単一メディアにも対応し、アルバムは動画と重複を除く', () => {
 const old = { ...post, media_url: 'https://example.invalid/photo.jpg', media_type: 'image' }
 assert.equal(postMedia(old)[0].url, old.media_url)
 assert.deepEqual(profilePhotos([old.media_url, 'https://example.invalid/other.jpg'], [old, { ...post, media_url: 'https://example.invalid/movie.mp4', media_type: 'video' }]), [old.media_url, 'https://example.invalid/other.jpg'])
 assert.deepEqual(profilePhotos(null, []), [])
})
test('公開メディアと外部リンクに実行可能URLを使わない', () => {
 for (const url of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', '/relative', 'not a URL', null]) assert.equal(publicWebUrl(url), undefined)
 assert.deepEqual(postMedia({ ...post, media_url: 'javascript:alert(1)' }), [])
 assert.deepEqual(profilePhotos(['data:image/svg+xml,fake', 'https://example.invalid/ok.jpg'], []), ['https://example.invalid/ok.jpg'])
})
test('以前の研修カテゴリと未知のカテゴリを表示できる', () => {
 assert.equal(postCategory('training'), 'event'); assert.equal(postCategory('daily'), 'daily'); assert.equal(postCategory('new-category'), 'other'); assert.equal(postCategory(null), 'other')
})
