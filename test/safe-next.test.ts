/**
 * Where a sign-in may send somebody.
 *
 *   npx tsx test/safe-next.test.ts
 *
 * The old check — "starts with `/` and not `//`" — let `/\evil.example/phish`
 * through, which browsers resolve to `https://evil.example/phish`. These are the
 * shapes that matter, with the reason each one is here.
 */
import assert from 'node:assert/strict'

import { safeNext } from '@/lib/safe-next'

let passed = 0
const test = (label: string, fn: () => void) => {
  try {
    fn()
    console.log(`  ok  ${label}`)
    passed++
  } catch (err) {
    console.error(`FAIL  ${label}\n      ${(err as Error).message}`)
    process.exitCode = 1
  }
}

const ORIGIN = 'https://app.ecommharvest.com'
/** Whatever survives must resolve to the same origin it was given against. */
const staysHere = (value: string) => new URL(value, ORIGIN).origin === ORIGIN

test('ordinary in-app paths are accepted unchanged', () => {
  for (const ok of [
    '/community',
    '/community/black-friday-discount-depth',
    '/learn',
    '/community?page=2',
    '/community/new?error=Try%20again',
    '/members#top',
  ]) {
    assert.equal(safeNext(ok), ok, ok)
  }
})

test('a protocol-relative URL is refused', () => {
  assert.equal(safeNext('//evil.example'), undefined)
  assert.equal(safeNext('//evil.example/phish'), undefined)
})

test('a backslash after the slash is refused — the one the old check missed', () => {
  // `/\evil.example` is a path to a naive check and a host to a browser.
  for (const evil of ['/\\evil.example', '/\\evil.example/phish', '/\\/evil.example', '\\\\evil.example']) {
    assert.equal(safeNext(evil), undefined, JSON.stringify(evil))
  }
})

test('absolute URLs and other schemes are refused', () => {
  for (const evil of [
    'https://evil.example',
    'http://evil.example/phish',
    'javascript:alert(1)',
    'data:text/html,<script>1</script>',
    'evil.example/phish',
    'community', // relative, so it would resolve against whatever page is current
  ]) {
    assert.equal(safeNext(evil), undefined, evil)
  }
})

test('an encoded slash or backslash at the start is refused', () => {
  assert.equal(safeNext('/%2Fevil.example'), undefined)
  assert.equal(safeNext('/%2fevil.example'), undefined)
  assert.equal(safeNext('/%5Cevil.example'), undefined)
})

test('whitespace and control characters are refused', () => {
  // A newline in a Location header is how a redirect becomes a header injection.
  for (const evil of ['/community\r\nSet-Cookie: x=1', '/community\n', '/ community', '/\tcommunity', '/a\u0000b']) {
    assert.equal(safeNext(evil), undefined, JSON.stringify(evil))
  }
})

test('non-strings and the empty string are refused', () => {
  for (const evil of [undefined, null, 0, {}, [], '', true]) {
    assert.equal(safeNext(evil as never), undefined, String(evil))
  }
})

test('an absurdly long value is refused', () => {
  assert.equal(safeNext('/' + 'a'.repeat(600)), undefined)
})

test('everything accepted stays on this origin, whatever it is', () => {
  /**
   * The property that matters, checked by the thing that actually matters: hand
   * a pile of hostile shapes to the URL parser the redirect will use, and every
   * one that `safeNext` lets through must still resolve to our own origin.
   */
  const hostile = [
    '/community', '//a.example', '/\\a.example', '/\\\\a.example', '/%2F/a.example',
    '/%5Ca.example', '/./\\a.example', '/..//a.example', '/ /a.example', '/\t/a.example',
    '/?//a.example', '/#//a.example', '/@a.example', '/:a.example', '/a.example',
  ]
  for (const value of hostile) {
    const accepted = safeNext(value)
    if (accepted !== undefined) {
      assert.ok(staysHere(accepted), `${JSON.stringify(value)} was accepted and leaves the site`)
    }
  }
})

console.log(`\n${passed} passed`)
