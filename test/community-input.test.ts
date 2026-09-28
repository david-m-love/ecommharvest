/**
 * What a member is allowed to post, and what their name is allowed to be.
 *
 *   npx tsx test/community-input.test.ts
 *
 * These run without a database on purpose. The rules about a valid question are
 * the ones most likely to be quietly loosened later — a maxLength dropped from
 * an input, a trim removed while tidying — and catching that should not require
 * standing Postgres up.
 */
import assert from 'node:assert/strict'

import {
  MAX_BODY,
  MAX_TITLE,
  isModeration,
  tidy,
  validateDisplayName,
  validateReply,
  validateThread,
} from '@/lib/community-input'

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

test('a real question goes through unchanged', () => {
  const result = validateThread({
    title: 'How deep should I discount on Black Friday?',
    body: 'Last year I went 30% off sitewide.\n\nMargin was thin. What would you do?',
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.value.title, 'How deep should I discount on Black Friday?')
  // Blank lines survive: they are how somebody writes a paragraph, and the
  // renderer turns them into <p>. Collapsing them would flatten every post.
  assert.ok(result.value.body.includes('\n\n'))
})

test('a title pasted with a line break in it becomes one line', () => {
  // Otherwise the break lands inside a link in the feed and the row breaks in
  // half. The body is allowed newlines; a title is not.
  const result = validateThread({ title: 'Black Friday\ndiscount depth', body: 'Detail here.' })
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.value.title, 'Black Friday discount depth')
})

test('an empty or whitespace-only post is refused, not stored', () => {
  assert.equal(validateThread({ title: '   ', body: 'Detail' }).ok, false)
  assert.equal(validateThread({ title: 'A real title here', body: '   \n  ' }).ok, false)
  assert.equal(validateReply({ body: '\n\n  \n' }).ok, false)
})

test('the caps are enforced on the server, not only by the input element', () => {
  // maxLength on an <input> is a courtesy to somebody typing. It is not a rule:
  // the form can be posted without ever touching the page.
  assert.equal(validateThread({ title: 'x'.repeat(MAX_TITLE + 1), body: 'ok' }).ok, false)
  assert.equal(validateThread({ title: 'A real title', body: 'x'.repeat(MAX_BODY + 1) }).ok, false)
  assert.equal(validateReply({ body: 'x'.repeat(MAX_BODY + 1) }).ok, false)
})

test('a non-string body is refused rather than stringified', () => {
  // `{}` posted as JSON must not become the post "[object Object]".
  assert.equal(validateThread({ title: 'A real title', body: { evil: true } }).ok, false)
  assert.equal(validateReply({ body: 42 }).ok, false)
})

test('runs of blank lines collapse, so one return-mashing post cannot span a screen', () => {
  assert.equal(tidy('a\n\n\n\n\nb'), 'a\n\nb')
  assert.equal(tidy('  padded  '), 'padded')
  assert.equal(tidy('windows\r\nline'), 'windows\nline')
})

test('an empty display name is allowed, and means "go back to the fallback"', () => {
  // Somebody who regrets putting their full name in a room of competitors has
  // to be able to take it out. Refusing empty would leave them typing a space.
  const result = validateDisplayName('   ')
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.value.displayName, null)
})

test('a display name cannot contain markup characters', () => {
  assert.equal(validateDisplayName('<script>alert(1)</script>').ok, false)
  assert.equal(validateDisplayName('Mitch > everyone').ok, false)
  const fine = validateDisplayName('  Mitch   Adams  ')
  assert.equal(fine.ok, true)
  if (fine.ok) assert.equal(fine.value.displayName, 'Mitch Adams')
})

test('only the five known moderation actions are actions', () => {
  for (const action of ['pin', 'unpin', 'lock', 'unlock', 'delete']) {
    assert.equal(isModeration(action), true, action)
  }
  // A closed list, so a typo or a probe is a 400 and never a fallthrough.
  for (const nope of ['', 'ban', 'DELETE', 'delete ', null, undefined, 1, {}]) {
    assert.equal(isModeration(nope), false, String(nope))
  }
})

console.log(`\n${passed} passed`)
