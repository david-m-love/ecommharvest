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

// --- the replay ----------------------------------------------------------

console.log('\nreplay')
{
  const found = await (await admin.request.get(`${B}/api/threads?where[slug][equals]=${slug}&limit=1`, { headers: H })).json()
  const id = found.docs?.[0]?.id
  check(Boolean(id), 'the thread can be found by an admin', String(id))

  const patch = (ctx, replayUrl) =>
    ctx.request.patch(`${B}/api/threads/${id}`, { data: { replayUrl }, headers: H })

  check((await patch(paid, 'https://youtu.be/dQw4w9WgXcQ')).status() === 403, 'a member cannot attach a replay', '403')
  check((await patch(admin, 'https://evil.example/embed/dQw4w9WgXcQ')).status() >= 400, 'a link that is not YouTube is refused when saved')
  check((await patch(admin, 'https://youtu.be/dQw4w9WgXcQ?t=30')).ok(), 'an admin can attach a YouTube link')

  const view = await paid.newPage()
  await view.goto(`${B}/community/${slug}`, { waitUntil: 'domcontentloaded' })
  const frame = await view.evaluate(() => {
    const f = document.querySelector('.replay iframe')
    return f ? { src: f.getAttribute('src'), title: f.getAttribute('title') } : null
  })
  check(Boolean(frame), 'the replay shows above the question')
  check(frame?.src === 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&start=30', 'and points at the privacy-enhanced embed', frame?.src)
  await view.close()

  const noReplay = await unpaid.newPage()
  await noReplay.goto(`${B}/community/${slug}`, { waitUntil: 'domcontentloaded' })
  const leaked = await noReplay.evaluate(() => document.querySelectorAll('iframe').length)
  check(leaked === 0, 'a non-member sees no player on the locked page')
  await noReplay.close()

  await patch(admin, '')
}

// --- the replays library -------------------------------------------------

console.log('\nreplays')
{
  const TITLE = `Replay test ${Date.now()}`
  const make = await admin.request.post(`${B}/api/replays`, {
    data: {
      title: TITLE,
      summary: 'What we covered, in a sentence.',
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
      recordedAt: '2026-11-24T12:00:00.000Z',
      published: false,
      notes: {
        root: {
          type: 'root', format: '', indent: 0, version: 1, direction: 'ltr',
          children: [
            { type: 'heading', tag: 'h2', format: '', indent: 0, version: 1, direction: 'ltr', children: [{ type: 'text', text: 'What we covered', version: 1 }] },
            { type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr', children: [{ type: 'text', text: 'A sticky add to cart button.', version: 1 }] },
          ],
        },
      },
    },
    headers: H,
  })
  check(make.ok(), 'an admin can add a replay', String(make.status()))
  const replay = (await make.json()).doc
  const slug = replay?.slug

  const bad = await admin.request.post(`${B}/api/replays`, {
    data: { title: 'Bad link', videoUrl: 'https://evil.example/embed/dQw4w9WgXcQ' },
    headers: H,
  })
  check(bad.status() >= 400, 'a link that is not YouTube is refused when saved', String(bad.status()))

  const memberPost = await paid.request.post(`${B}/api/replays`, { data: { title: 'x' }, headers: H })
  check([401, 403].includes(memberPost.status()), 'a member cannot add one', String(memberPost.status()))

  // A private file, uploaded the way the admin does it.
  const upload = await admin.request.post(`${B}/api/replay-files`, {
    headers: H,
    multipart: { file: { name: 'worksheet.txt', mimeType: 'text/plain', buffer: Buffer.from('Margin worksheet') } },
  })
  check(upload.ok(), 'an admin can upload a private file', String(upload.status()))
  const file = (await upload.json()).doc
  const refusedType = await admin.request.post(`${B}/api/replay-files`, {
    headers: H,
    multipart: { file: { name: 'x.html', mimeType: 'text/html', buffer: Buffer.from('<script>1</script>') } },
  })
  check(refusedType.status() >= 400, 'an HTML file is refused', String(refusedType.status()))

  await admin.request.patch(`${B}/api/replays/${replay.id}`, {
    data: { attachments: [{ label: 'Margin worksheet', file: file.id }] },
    headers: H,
  })

  // Draft: invisible to members at the page and at the API.
  const draftPage = await paid.request.get(`${B}/replays/${slug}`, { headers: H })
  check(draftPage.status() === 404, 'a draft is a 404 to a member', String(draftPage.status()))
  const draftList = await (await paid.request.get(`${B}/api/replays?limit=100`, { headers: H })).json()
  check((draftList.docs || []).length === 0, 'and absent from /api/replays', String((draftList.docs || []).length))
  const draftFeed = await (await paid.request.get(`${B}/replays`, { headers: H })).text()
  check(!draftFeed.includes(TITLE), 'and from the list')
  const adminDraft = await admin.request.get(`${B}/replays/${slug}`, { headers: H })
  check(adminDraft.status() === 200, 'an admin can preview it', String(adminDraft.status()))

  await admin.request.patch(`${B}/api/replays/${replay.id}`, { data: { published: true }, headers: H })

  const view = await paid.newPage()
  await view.goto(`${B}/replays/${slug}`, { waitUntil: 'domcontentloaded' })
  const seen = await view.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent?.trim(),
    src: document.querySelector('.replay iframe')?.getAttribute('src'),
    summary: document.querySelector('.replay-summary')?.textContent?.trim(),
    notes: document.querySelector('.replay-notes')?.textContent || '',
    link: document.querySelector('.replay-downloads a')?.getAttribute('href'),
    label: document.querySelector('.replay-downloads a')?.textContent?.trim(),
    tab: [...document.querySelectorAll('.appbar-nav a')].map((a) => a.textContent.trim()),
  }))
  check(seen.h1 === TITLE, 'a published replay opens for a member', seen.h1)
  check(seen.src === 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0', 'with the video above the notes', seen.src)
  check(Boolean(seen.summary), 'and its summary')
  check(seen.notes.includes('What we covered') && seen.notes.includes('sticky add to cart'), 'and its notes, as written', seen.notes.slice(0, 50))
  check(/Margin worksheet/.test(seen.label || '') && (seen.link || '').startsWith('/api/replay-files/file/'), 'and its download, served by this site', seen.link)
  check(seen.tab.includes('Replays'), 'and the Replays tab is in the bar')
  await view.close()

  const listing = await (await paid.request.get(`${B}/replays`, { headers: H })).text()
  check(listing.includes(TITLE), 'it is in the list')

  // The files are the part that must not leak.
  const mine = await paid.request.get(`${B}${seen.link}`, { headers: H })
  check(mine.status() === 200 && (await mine.text()).includes('Margin worksheet'), 'a member can download the file', String(mine.status()))
  const theirs = await unpaid.request.get(`${B}${seen.link}`, { headers: H })
  check([401, 403, 404].includes(theirs.status()), 'a signed-in non-member cannot', String(theirs.status()))
  const nobody = await anon.request.get(`${B}${seen.link}`, { headers: H })
  check([401, 403, 404].includes(nobody.status()), 'and a signed-out visitor cannot', String(nobody.status()))

  // The door.
  const locked = await (await unpaid.request.get(`${B}/replays`, { headers: H })).text()
  check(locked.includes('membership is not active') && !locked.includes(TITLE), 'a non-member sees the door and no title')
  const lockedOne = await unpaid.request.get(`${B}/replays/${slug}`, { headers: H, maxRedirects: 0 })
  check([307, 302, 303].includes(lockedOne.status()), 'and is bounced from a direct link', String(lockedOne.status()))
  const api = await unpaid.request.get(`${B}/api/replays?limit=100`, { headers: H })
  check(api.status() === 403 || ((await api.json()).docs || []).length === 0, 'and reads none through the API', String(api.status()))
  const anonPage = await anon.request.get(`${B}/replays`, { headers: H, maxRedirects: 0 })
  check([307, 302, 303].includes(anonPage.status()) && (anonPage.headers()['location'] || '').includes('/login'), 'a signed-out visitor is sent to sign in')

  // On a phone.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await paid.storageState() })
  const pp = await phone.newPage()
  await pp.goto(`${B}/replays/${slug}`, { waitUntil: 'load' })
  const overflow = await pp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check(overflow <= 0, 'the replay does not push sideways on a phone', `${overflow}px`)
  await phone.close()

  await admin.request.delete(`${B}/api/replays/${replay.id}`, { headers: H })
  await admin.request.delete(`${B}/api/replay-files/${file.id}`, { headers: H })
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
