/**
 * The sign-in email.
 *
 *   npx tsx test/login-email.test.ts
 *
 * For most members this is the only message the product ever sends them, and it
 * is the one standing between them and the thing they pay for. The failures
 * worth catching are the ones that look fine in a preview and lock somebody out
 * in a real inbox:
 *
 *   - No text part, so a plain-text client renders an empty message.
 *   - The URL only inside an HTML button, so a mail rewriter that strips the
 *     button leaves no way in.
 *   - Punctuation welded to the end of the URL in the text part, which mail
 *     clients swallow into the address when they auto-link it.
 *   - A stated expiry that disagrees with the real one.
 */
import assert from 'node:assert/strict'

import { TOKEN_TTL_MS, expiryPhrase, loginEmail } from '@/lib/login-email'

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

const LINK = 'https://app.ecommharvest.com/api/auth/verify?token=abc123XYZ_-'
const mail = loginEmail(LINK)

test('there is a text part, not HTML only', () => {
  // An HTML-only message scores worse with spam filters and renders as nothing
  // at all in a plain-text client — which for a login email means locked out.
  assert.ok(mail.text.length > 80, 'the text part is missing or too short')
  assert.doesNotMatch(mail.text, /<[a-z]/i, 'the text part contains markup')
})

test('the link is in both parts', () => {
  assert.ok(mail.html.includes(LINK), 'the HTML part has no link')
  assert.ok(mail.text.includes(LINK), 'the text part has no link')
})

test('the HTML shows the raw address as well as the button', () => {
  /**
   * Corporate mail rewriters strip or rewrite buttons, and some clients render
   * a styled anchor as a blank gap. A visible address is the escape hatch, so
   * the link has to appear twice: once as the button, once as text.
   */
  const occurrences = mail.html.split(LINK).length - 1
  assert.ok(occurrences >= 2, `the address appears ${occurrences}× — expected the button and the visible URL`)
})

test('nothing is welded to the end of the URL in the text part', () => {
  /**
   * Mail clients auto-link plain text by scanning to the next whitespace, so a
   * trailing full stop or bracket gets swallowed into the address and the link
   * 404s. The URL has to end the line.
   */
  const line = mail.text.split('\n').find((l) => l.includes(LINK))
  assert.ok(line, 'the link is not on a line of its own')
  assert.equal(line!.trim(), LINK, `the link shares its line with: "${line!.trim()}"`)
})

test('both parts state the expiry, and it is the real one', () => {
  // 15 minutes is not typed into the copy anywhere — it is derived from the
  // same constant the token store uses, so the email cannot promise a window
  // the token does not honour.
  const phrase = expiryPhrase()
  assert.equal(phrase, '15 minutes')
  assert.ok(mail.html.includes(phrase), 'the HTML does not state the expiry')
  assert.ok(mail.text.includes(phrase), 'the text does not state the expiry')
  assert.equal(expiryPhrase(TOKEN_TTL_MS), phrase)
  // Singular reads correctly too, for whenever somebody shortens the window.
  assert.equal(expiryPhrase(60_000), '1 minute')
})

test('both parts say what to do if you did not ask for this', () => {
  for (const part of [mail.html, mail.text]) {
    assert.match(part, /ignore this email/i)
  }
})

test('the subject is short and says what it is', () => {
  assert.equal(mail.subject, 'Your eCommHarvest login link')
  // Long subjects are truncated in every mobile client; this one has to survive.
  assert.ok(mail.subject.length <= 45, `${mail.subject.length} characters`)
})

test('a quote in the link cannot break out of the href', () => {
  /**
   * Not reachable today — the token is base64url and we build the address
   * ourselves. Asserted so it stays unreachable if `next` ever reaches the URL:
   * an email template is where a stray quote stops being a typo and starts
   * being somebody else's redirect.
   */
  const hostile = loginEmail('https://example.com/?t=a" onmouseover="evil()')
  assert.ok(!hostile.html.includes('onmouseover="evil()'), 'the attribute was broken out of')
  assert.ok(hostile.html.includes('&quot;'), 'the quote was not escaped')
})

test('the HTML button survives Outlook', () => {
  // Outlook on Windows renders through Word, which ignores padding on an
  // anchor. The padding has to sit on a table cell or the button collapses to
  // underlined text with nothing to tap.
  assert.match(mail.html, /<table[^>]*>[\s\S]*bgcolor=/i, 'the button is not table-based')
})

console.log(`\n${passed} passed`)
