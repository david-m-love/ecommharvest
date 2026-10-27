/**
 * Which requests are somebody following a link, and which are somebody
 * attacking with one.
 *
 *   npx tsx test/navigation.test.ts
 *
 * `isTopLevelNavigation` decides when we tell Payload to trust a session cookie
 * that it would otherwise discard for being cross-site. Getting it too narrow
 * locks members out whenever they arrive from an email; getting it too wide
 * lets another site act as a signed-in member. Both are asserted.
 */
import assert from 'node:assert/strict'

import { isTopLevelNavigation } from '@/lib/navigation'

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

const from = (headers: Record<string, string>) => (name: string) => headers[name] ?? null

test('a link clicked in an email is a top-level navigation', () => {
  assert.equal(
    isTopLevelNavigation(from({ 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document' })),
    true,
  )
})

test('a page embedded in a frame is not', () => {
  // Cross-site framing is the clickjacking shape. Frames are `dest: iframe`.
  for (const dest of ['iframe', 'frame', 'embed', 'object']) {
    assert.equal(
      isTopLevelNavigation(from({ 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': dest })),
      false,
      dest,
    )
  }
})

test('a script reading the page with fetch() is not', () => {
  assert.equal(
    isTopLevelNavigation(from({ 'sec-fetch-mode': 'cors', 'sec-fetch-dest': 'empty' })),
    false,
  )
  assert.equal(
    isTopLevelNavigation(from({ 'sec-fetch-mode': 'no-cors', 'sec-fetch-dest': 'empty' })),
    false,
  )
})

test('images, scripts and styles are not', () => {
  for (const dest of ['image', 'script', 'style', 'font', 'audio', 'video']) {
    assert.equal(
      isTopLevelNavigation(from({ 'sec-fetch-mode': 'no-cors', 'sec-fetch-dest': dest })),
      false,
      dest,
    )
  }
})

test('a navigation carrying an Origin header is not — that is a form POST', () => {
  /**
   * A forged form submission is also "a navigation", and it is the one that
   * matters: browsers attach `Origin` to every cross-site POST, which is the
   * whole reason it is the field that keeps this out.
   */
  assert.equal(
    isTopLevelNavigation(
      from({
        'sec-fetch-mode': 'navigate',
        'sec-fetch-dest': 'document',
        origin: 'https://evil.example',
      }),
    ),
    false,
  )
})

test('a request with no fetch metadata at all is not', () => {
  // A non-browser client, or a browser too old to send it. Payload's own check
  // handles those; this must never invent trust from silence.
  assert.equal(isTopLevelNavigation(from({})), false)
  assert.equal(isTopLevelNavigation(from({ 'sec-fetch-mode': 'navigate' })), false)
  assert.equal(isTopLevelNavigation(from({ 'sec-fetch-dest': 'document' })), false)
})

console.log(`\n${passed} passed`)
