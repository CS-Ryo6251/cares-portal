const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const { NextRequest } = require('next/server')

function load(file, mocks = {}) {
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const resolve = name => mocks[name] || (name === '@/lib/auth-redirect' ? load('lib/auth-redirect.ts') : require(name))
  new Function('require', 'module', 'exports', code)(resolve, mod, mod.exports)
  return mod.exports
}

test('ログイン後は同一サイトのパスだけを許可し、検索条件を保持する', () => {
  const { safeAuthRedirect } = load('lib/auth-redirect.ts')
  assert.equal(safeAuthRedirect('/directory/123?tab=reviews#heart'), '/directory/123?tab=reviews#heart')
  for (const input of [null, '', 'https://example.com', '//example.com', '/\\example.com', 'javascript:alert(1)', '/\n/example.com', '/login', '/signup']) {
    assert.equal(safeAuthRedirect(input), '/', String(input))
  }
})

function middlewareWithSession(user, cookie) {
  return load('middleware.ts', {
    '@supabase/ssr': { createServerClient: (_url, _key, options) => ({
      auth: { getUser: async () => {
        if (cookie) options.cookies.setAll([cookie])
        return { data: { user } }
      } },
    }) },
  }).middleware
}

test('認証のリダイレクトにも更新済みセッションCookieを引き継ぐ', async () => {
  const middleware = middlewareWithSession({ id: 'synthetic-user' }, { name: 'sb-test-auth-token', value: 'new-session', options: { path: '/', sameSite: 'lax' } })
  const response = await middleware(new NextRequest('https://cares.example/login?redirect=%2Faccount'))
  assert.equal(response.headers.get('location'), 'https://cares.example/account')
  assert.equal(response.cookies.get('sb-test-auth-token').value, 'new-session')
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  const external = await middleware(new NextRequest('https://cares.example/login?redirect=https%3A%2F%2Fevil.example'))
  assert.equal(external.headers.get('location'), 'https://cares.example/')
})

test('期限切れセッションの削除Cookieと保護画面の検索条件を保持する', async () => {
  const middleware = middlewareWithSession(null, { name: 'sb-test-auth-token', value: '', options: { path: '/', maxAge: 0 } })
  const response = await middleware(new NextRequest('https://cares.example/favorites?area=yamagata'))
  assert.equal(new URL(response.headers.get('location')).searchParams.get('redirect'), '/favorites?area=yamagata')
  assert.equal(response.cookies.get('sb-test-auth-token').maxAge, 0)
})

test('通常の公開閲覧は通し、認証Cookieを書き換えた応答のみキャッシュを禁止する', async () => {
  const request = new NextRequest('https://cares.example/directory')
  const publicResponse = await middlewareWithSession(null)(request)
  assert.equal(publicResponse.status, 200)
  assert.equal(publicResponse.headers.get('cache-control'), null)
  const refreshed = await middlewareWithSession({ id: 'synthetic-user' }, { name: 'sb-test-auth-token', value: 'refreshed', options: { path: '/' } })(request)
  assert.equal(refreshed.cookies.get('sb-test-auth-token').value, 'refreshed')
  assert.equal(refreshed.headers.get('cache-control'), 'private, no-store')
})
