/**
 * Links typed into the builder, and where they actually go.
 *
 *   npx tsx test/href.test.ts
 *
 * The case that prompted it: the masterclass button's link was changed from
 * `/register` to `go.ecommharvest.com/register`, and the button started pointing
 * at `app.ecommharvest.com/go.ecommharvest.com/register`. That is HTML doing what
 * it is told — an href with no scheme and no leading slash is a *relative* path —
 * but writing an address without `https://` is how people write addresses, so it
 * has to mean what they meant.
 *
 * No database and no network: it is a pure function, which is the point of
 * having one.
 */
import assert from 'node:assert/strict'

import { isExternalHref, toHref } from '@/lib/href'

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

test('the reported case: a bare host becomes an address, not a path', () => {
  assert.equal(toHref('go.ecommharvest.com/register'), 'https://go.ecommharvest.com/register')
})

test('a host with no path', () => {
  assert.equal(toHref('go.ecommharvest.com'), 'https://go.ecommharvest.com')
  assert.equal(toHref('www.example.com'), 'https://www.example.com')
})

test('a host with a port, a query and a fragment', () => {
  assert.equal(toHref('example.com:3000/x'), 'https://example.com:3000/x')
  assert.equal(toHref('example.com?a=1'), 'https://example.com?a=1')
  assert.equal(toHref('example.com#top'), 'https://example.com#top')
})

test('a full address is left exactly as it is', () => {
  assert.equal(toHref('https://go.ecommharvest.com/register'), 'https://go.ecommharvest.com/register')
  assert.equal(toHref('http://example.com'), 'http://example.com')
  assert.equal(toHref('//cdn.example.com/x'), '//cdn.example.com/x')
})

test('other schemes are not touched', () => {
  assert.equal(toHref('mailto:privacy@ecommharvest.com'), 'mailto:privacy@ecommharvest.com')
  assert.equal(toHref('tel:+12085550000'), 'tel:+12085550000')
})

test('a path on this site stays a path', () => {
  assert.equal(toHref('/register'), '/register')
  assert.equal(toHref('/masterclass/thanks'), '/masterclass/thanks')
  assert.equal(toHref('#speakers'), '#speakers')
  assert.equal(toHref('?utm_source=x'), '?utm_source=x')
})

test('a page written without its slash gets one', () => {
  // Left alone it would resolve against the page it sits on: fine at the site
  // root, wrong on /masterclass.
  assert.equal(toHref('register'), '/register')
})

test('whitespace and empty values', () => {
  assert.equal(toHref('  go.ecommharvest.com/register  '), 'https://go.ecommharvest.com/register')
  assert.equal(toHref(''), undefined)
  assert.equal(toHref('   '), undefined)
  assert.equal(toHref(undefined), undefined)
  assert.equal(toHref(null), undefined)
})

test('a hostname is not confused with a path that has a dot in it', () => {
  // A file at the site root, not a host: it has a slash before the dot.
  assert.equal(toHref('/files/guide.pdf'), '/files/guide.pdf')
})

test('leaving the site is judged after normalising, not before', () => {
  // The whole reason this exists: before normalising, this looks internal.
  assert.equal(isExternalHref('go.ecommharvest.com/register'), true)
  assert.equal(isExternalHref('https://example.com'), true)
  assert.equal(isExternalHref('mailto:hi@example.com'), true)
  assert.equal(isExternalHref('/register'), false)
  assert.equal(isExternalHref('register'), false)
  assert.equal(isExternalHref('#top'), false)
  assert.equal(isExternalHref(''), false)
})

console.log(`\n${passed} passed`)
