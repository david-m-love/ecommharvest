/**
 * The private community, driven end to end against a live server.
 *
 *   npm run dev        # in another terminal, migrated
 *   npm run test:community
 *
 * This is the room where paying founders discuss their actual revenue in front
 * of people who sell what they sell, so the failures worth catching are not
 * cosmetic:
 *
 *   - Somebody who has not paid getting in. The `member` role means nothing
 *     here — every masterclass registrant has one — so the only thing standing
 *     between the registration list and the room is the entitlement check.
 *   - A member's email address appearing on a page. The read layer fetches
 *     authors with `overrideAccess`, which puts every column within reach; only
 *     a `select` and `bylineOf` keep the address off the screen.
 *   - A locked thread that is only locked in the template, so a `fetch` posts
 *     straight through it.
 *   - A member pinning or deleting, which would make moderation decorative.
 *
 * Needs only `npm run seed`. The two member accounts it compares — one paying,
 * one not — are created here as the seeded admin rather than expected to exist,
 * because the whole suite turns on the difference between them and a fixture
 * somebody has to remember to create is a fixture that eventually drifts.
 */
import { chromium } from 'playwright'

const B = process.env.TEST_BASE_URL || 'http://localhost:3000'
// The seed's dev password, shared by every account here including the two this
// file creates.
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'change-me-locally-8f2a'
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'david@lovemarketing.digital'
const PAID = 'community-paid@example.test'
const UNPAID = 'community-unpaid@example.test'
// Payload honours cookie auth only for origins in its `csrf` list. Without this
// header every request reads as signed out and the suite passes for the wrong
// reason.
const H = { Origin: B }

let passed = 0
let failed = 0
const check = (ok, label, detail = '') => {
  console.log(`${ok ? ' ok ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`)
  ok ? passed++ : failed++
}

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
)

const signIn = async (email) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const res = await ctx.request.post(`${B}/api/users/login`, {
    data: { email, password: PASSWORD },
    headers: H,
  })
  if (!res.ok()) throw new Error(`could not sign in ${email}: ${res.status()}`)
  return ctx
}

const anon = await browser.newContext()
const admin = await signIn(ADMIN_EMAIL)

const post = (ctx, path, data) =>
  ctx.request.post(`${B}${path}`, { data, headers: H, maxRedirects: 0 })

/** Creates the account if it is not there yet, and returns its id either way. */
const ensureMember = async (email, displayName) => {
  const found = await admin.request.get(
    `${B}/api/users?where[email][equals]=${encodeURIComponent(email)}&limit=1`,
    { headers: H },
  )
  const existing = (await found.json().catch(() => ({}))).docs?.[0]
  if (existing) {
    await admin.request.patch(`${B}/api/users/${existing.id}`, {
      data: { displayName },
      headers: H,
    })
    return existing.id
  }
  const made = await admin.request.post(`${B}/api/users`, {
    data: { email, password: PASSWORD, roles: ['member'], displayName },
    headers: H,
  })
  if (!made.ok()) throw new Error(`could not create ${email}: ${made.status()}`)
  return (await made.json()).doc.id
}

const paidId = await ensureMember(PAID, 'Mitch A')
await ensureMember(UNPAID, 'Nobody')

// One pays, one does not. Everything below turns on that difference.
await post(admin, '/api/admin/membership', { userId: paidId, action: 'grant' })

const paid = await signIn(PAID)
const unpaid = await signIn(UNPAID)

// --- who gets in ---------------------------------------------------------

console.log('\nthe door')
{
  const res = await anon.request.get(`${B}/community`, { headers: H, maxRedirects: 0 })
  const to = res.headers()['location'] || ''
  check(
    [307, 302, 303].includes(res.status()) && to.includes('/login'),
    'a signed-out visitor is sent to sign in',
    `${res.status()} → ${to}`,
  )
}
{
  /**
   * The check this whole feature turns on. This account is a real, signed-in
   * user with `roles: ['member']` and no entitlement — exactly what every
   * masterclass registrant is.
   *
   * It gets a 200, not a redirect: `/weekly` is a draft until somebody
   * publishes it, so bouncing them there was bouncing them to a 404. What
   * matters is that the page carries no thread — asserted below, after there is
   * one to leak.
   */
  const res = await unpaid.request.get(`${B}/community`, { headers: H })
  const html = await res.text()
  check(
    res.status() === 200 && html.includes('membership is not active'),
    'a signed-in member with no membership is shown the door, not the room',
    String(res.status()),
  )
  check(!html.includes('Ask a question'), 'and is not offered the composer')
}
{
  const res = await paid.request.get(`${B}/community`, { headers: H })
  check(res.status() === 200, 'a paid-up member does', String(res.status()))
}

// --- the REST API, which the pages do not protect ------------------------

console.log('\nthe collections’ own endpoints')
{
  // Payload publishes /api/threads whatever the pages do. If its access rule
  // were `true` or `Boolean(req.user)`, every registrant could read the room
  // with one request and never touch the UI.
  const res = await unpaid.request.get(`${B}/api/threads?limit=100`, { headers: H })
  const body = await res.json().catch(() => ({}))
  check(
    res.status() === 403 || (body.docs || []).length === 0,
    'a non-member reads no threads from /api/threads',
    `${res.status()} · ${(body.docs || []).length} docs`,
  )
}
{
  const res = await anon.request.get(`${B}/api/replies?limit=100`, { headers: H })
  const body = await res.json().catch(() => ({}))
  check(
    res.status() === 403 || (body.docs || []).length === 0,
    'a signed-out visitor reads no replies',
    `${res.status()} · ${(body.docs || []).length} docs`,
  )
}

// --- posting -------------------------------------------------------------

console.log('\nasking and answering')
const title = `Discount depth for BFCM ${Date.now()}`
let slug = ''
{
  const res = await post(paid, '/api/community/threads', { title, body: 'Went 30% off last year.\n\nMargin was thin. What would you do?' })
  const body = await res.json().catch(() => ({}))
  slug = (body.path || '').replace('/community/', '')
  check(res.status() === 200 && Boolean(slug), 'a member can ask a question', body.path || String(res.status()))
}
{
  const res = await post(unpaid, '/api/community/threads', { title: 'Should not exist', body: 'nope' })
  check(res.status() === 403, 'a non-member cannot ask one', String(res.status()))
}
{
  const res = await post(paid, '/api/community/replies', { slug, body: 'I would go 20% and gate it behind email.' })
  check(res.status() === 200, 'a member can reply', String(res.status()))
}
{
  const res = await post(unpaid, '/api/community/replies', { slug, body: 'nope' })
  check(res.status() === 403, 'a non-member cannot reply', String(res.status()))
}
{
  const res = await post(paid, '/api/community/threads', { title: 'x', body: 'y' })
  check(res.status() === 422, 'a too-short question is refused by the server', String(res.status()))
}

// --- what the page actually shows ---------------------------------------

console.log('\nthe page')
const page = await paid.newPage()
await page.goto(`${B}/community/${slug}`, { waitUntil: 'domcontentloaded' })
{
  const html = await page.content()
  check(html.includes(title), 'the question is on its page')
  check(html.includes('I would go 20%'), 'so is the reply')
  check(html.includes('Mitch A'), 'the author’s display name is shown')
  /**
   * The assertion that matters most on this page. Not "is it escaped" — React
   * escapes — but "is it here at all".
   */
  check(
    !html.includes(PAID) && !html.includes('@example.test'),
    'no member email address appears anywhere in the HTML',
  )
}
{
  // The locked page, now that there is something to leak.
  const res = await unpaid.request.get(`${B}/community`, { headers: H })
  const html = await res.text()
  check(!html.includes(title), 'a non-member sees no thread title on the locked page')
  check(!html.includes('Mitch A'), 'and no member names')
}
{
  const feed = await paid.newPage()
  await feed.goto(`${B}/community`, { waitUntil: 'domcontentloaded' })
  const html = await feed.content()
  check(html.includes(title), 'and in the feed')
  check(!html.includes('@example.test'), 'no email address in the feed either')
  const replyCount = await feed.evaluate(() =>
    Array.from(document.querySelectorAll('.thread-meta')).map((n) => n.textContent).join(' '),
  )
  check(/1 reply/.test(replyCount), 'the reply count is maintained', replyCount.slice(0, 60))
  await feed.close()
}

// --- moderation ----------------------------------------------------------

console.log('\nmoderation')
{
  const res = await post(paid, '/api/community/moderate', { slug, action: 'pin' })
  check(res.status() === 403, 'a member cannot pin', String(res.status()))
}
{
  const res = await post(paid, '/api/community/moderate', { slug, action: 'delete' })
  check(res.status() === 403, 'a member cannot delete', String(res.status()))
}
{
  const res = await post(admin, '/api/community/moderate', { slug, action: 'pin' })
  check(res.status() === 200, 'an admin can pin', String(res.status()))
  const feed = await paid.newPage()
  await feed.goto(`${B}/community`, { waitUntil: 'domcontentloaded' })
  const first = await feed.evaluate(
    () => document.querySelector('.thread h2')?.textContent?.trim() || '',
  )
  check(first === title, 'and a pinned thread sorts to the top', first.slice(0, 50))
  await feed.close()
}
{
  await post(admin, '/api/community/moderate', { slug, action: 'lock' })
  /**
   * Locked on the server, not just hidden in the template. A lock that only
   * removes the textarea is a lock anybody can post through with one line of
   * `fetch` — and the moment a thread is locked is exactly when somebody wants
   * to.
   */
  const res = await post(paid, '/api/community/replies', { slug, body: 'sneaking in' })
  check(res.status() === 403, 'a locked thread refuses replies at the API', String(res.status()))

  const view = await paid.newPage()
  await view.goto(`${B}/community/${slug}`, { waitUntil: 'domcontentloaded' })
  const boxes = await view.evaluate(() => document.querySelectorAll('textarea[name=body]').length)
  check(boxes === 0, 'and the reply box is gone from the page')
  await view.close()
}
{
  await post(admin, '/api/community/moderate', { slug, action: 'unlock' })
  const res = await post(paid, '/api/community/replies', { slug, body: 'back open' })
  check(res.status() === 200, 'unlocking lets replies through again', String(res.status()))
}

// --- the profile ---------------------------------------------------------

console.log('\nthe display name')
{
  const res = await post(paid, '/api/community/profile', { displayName: '<script>x</script>' })
  check(res.status() === 422, 'a name containing markup is refused', String(res.status()))
}
{
  const res = await post(paid, '/api/community/profile', { displayName: 'Mitch A' })
  check(res.status() === 200, 'an ordinary name is accepted', String(res.status()))
}

// --- membership lifecycle ------------------------------------------------

console.log('\ncancel is not remove')
const userId = paidId
{
  const res = await post(admin, '/api/admin/membership', { userId, action: 'cancel' })
  check(res.status() === 200, 'an admin can cancel a membership', String(res.status()))
  const still = await paid.request.get(`${B}/community`, { headers: H, maxRedirects: 0 })
  /**
   * The behaviour the two-date design exists for. Cancelled today, paid through
   * the end of the period — they keep the room. Taking it away now would be
   * charging for a month and delivering three days of it.
   */
  check(still.status() === 200, 'and the member keeps access until the period ends', String(still.status()))
}
{
  const res = await post(admin, '/api/admin/membership', { userId, action: 'revoke' })
  check(res.status() === 200, 'an admin can remove someone immediately', String(res.status()))
  const out = await paid.request.get(`${B}/community`, { headers: H })
  const html = await out.text()
  check(
    out.status() === 200 && html.includes('membership is not active') && !html.includes(title),
    'and that takes the room away at once',
    String(out.status()),
  )
  // The pages with nothing to show a non-member still bounce, to /community.
  const thread = await paid.request.get(`${B}/community/${slug}`, { headers: H, maxRedirects: 0 })
  check(
    [307, 302, 303].includes(thread.status()),
    'and a direct link to a thread no longer opens it',
    String(thread.status()),
  )
}
{
  // Put it back, so the fixture is where the next run expects it.
  const res = await post(admin, '/api/admin/membership', { userId, action: 'grant' })
  check(res.status() === 200, 'and granting again restores it', String(res.status()))
  const back = await paid.request.get(`${B}/community`, { headers: H })
  check(back.status() === 200, 'the member is back in the room', String(back.status()))
}

// --- a phone -------------------------------------------------------------

console.log('\non a phone')
{
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await phone.addCookies(await paid.cookies())
  const p = await phone.newPage()
  for (const path of ['/community', `/community/${slug}`, '/community/new']) {
    await p.goto(`${B}${path}`, { waitUntil: 'domcontentloaded' })
    const overflow = await p.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    check(overflow <= 1, `${path} does not push sideways`, `${overflow}px`)
  }
  await phone.close()
}

await browser.close()
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
