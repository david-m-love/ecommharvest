/**
 * End-to-end checks for the admin, the role system and the page builder.
 *
 *   npm run dev   (in another terminal, with a seeded database)
 *   npm run test:builder
 *
 * What this is really for: the role system is a set of claims — "a page editor
 * cannot publish", "a teammate cannot promote themselves" — and a claim about
 * permissions that is not executed is a guess. Every one of them is exercised
 * here against real HTTP.
 *
 * Every request sets `Origin`. Payload only honours cookie auth for origins in
 * its `csrf` list, so without one every call reads as unauthenticated and the
 * whole suite would pass for the wrong reason.
 */

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'change-me-locally-8f2a'
const ADMIN = process.env.SEED_ADMIN_EMAIL || 'david@lovemarketing.digital'
const MEMBER = process.env.SEED_MEMBER_EMAIL || 'member@example.com'
const TEAMMATE = process.env.SEED_TEAMMATE_EMAIL || 'teammate@example.com'

let passed = 0
let failed = 0
const check = (ok, label, detail = '') => {
  console.log(`${ok ? ' ok ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`)
  ok ? passed++ : failed++
}

const login = async (email) => {
  const res = await fetch(`${BASE}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE },
    body: JSON.stringify({ email, password: PASSWORD }),
  })
  const cookie = (res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
  return { status: res.status, cookie }
}

const H = (session) => ({
  Origin: BASE,
  'Content-Type': 'application/json',
  ...(session ? { Cookie: session.cookie } : {}),
})

// --- sign in ------------------------------------------------------------

console.log('sign in with email and password')
const admin = await login(ADMIN)
check(admin.status === 200 && admin.cookie.includes('payload-token'), 'admin signs in', `${admin.status}`)
const mate = await login(TEAMMATE)
check(mate.status === 200, 'teammate signs in', `${mate.status}`)
const member = await login(MEMBER)
check(member.status === 200, 'member signs in', `${member.status}`)

const bad = await login('nobody@example.com')
check(bad.status >= 400, 'an unknown email cannot sign in', `${bad.status}`)
const wrongPassword = await fetch(`${BASE}/api/users/login`, {
  method: 'POST',
  headers: H(null),
  body: JSON.stringify({ email: ADMIN, password: 'not-the-password' }),
})
check(wrongPassword.status >= 400, 'a wrong password cannot sign in', `${wrongPassword.status}`)

if (failed) {
  console.log('\nsign-in failed, so nothing below would mean anything. Is the database seeded?')
  process.exit(1)
}

// --- what the page editor role can and cannot do ------------------------

console.log('\npage editor: builds pages, cannot publish them')

let res = await fetch(`${BASE}/api/builder/new`, {
  method: 'POST',
  headers: H(mate),
  redirect: 'manual',
})
check(res.status === 303, 'can create a page', `${res.status}`)
const pageId = Number((res.headers.get('location') || '').split('/').pop())
check(Number.isFinite(pageId), 'create lands in the builder', `id ${pageId}`)

/**
 * A realistic layout: every block, each carrying explicit props.
 *
 * Not `{ type, props: { id } }` — that was the first version of this test and it
 * failed usefully. Puck materialises a component's `defaultProps` in the editor
 * when the block is dropped in, not at render time, so a stored layout carrying
 * only an id renders its wrapper and no content. Correct behaviour (the blocks
 * guard every field, so a missing prop renders nothing rather than "undefined"),
 * but it means asserting against default copy tests the wrong thing.
 *
 * Marker text per block instead, so this proves props actually reach the output.
 * That the defaults themselves survive a round trip is checked in the browser,
 * where the editor is the thing that puts them there — see test/builder.ui.mjs.
 */
const MARK = 'MARKER'
const layout = {
  root: {},
  content: [
    { type: 'Hero', props: { id: 'b0', eyebrow: `hero-eyebrow-${MARK}`, heading: `hero-heading-${MARK}`, deck: 'deck', body: 'lead paragraph', when: 'a date', ctaLabel: 'Save my seat', ctaHref: '/register', ctaMicro: 'micro' } },
    { type: 'HostedBy', props: { id: 'b1', label: `hosts-label-${MARK}`, hosts: [{ name: `host-name-${MARK}`, monogram: 'ABC', href: 'https://example.com/' }] } },
    { type: 'DarkCard', props: { id: 'b2', eyebrow: 'eyebrow', heading: `dark-heading-${MARK}`, body: 'first para\n\nsecond para', kicker: `dark-kicker-${MARK}` } },
    { type: 'BulletList', props: { id: 'b3', eyebrow: 'eyebrow', leadIn: `bullets-lead-${MARK}`, bullets: [{ lead: `bullet-lead-${MARK}`, text: 'and the rest' }] } },
    { type: 'FormulaBar', props: { id: 'b4', terms: [{ term: `term-a-${MARK}` }, { term: 'term-b' }], result: `result-${MARK}`, caption: `caption-${MARK}`, note: `note-${MARK}` } },
    { type: 'CardRow', props: { id: 'b5', eyebrow: 'eyebrow', heading: `cards-heading-${MARK}`, body: 'intro', background: 'wash', cards: [{ title: `card-title-${MARK}`, body: 'card body' }, { title: 'second', body: 'body' }] } },
    { type: 'Speakers', props: { id: 'b6', eyebrow: 'eyebrow', heading: `speakers-heading-${MARK}`, people: [{ label: 'Presenter', name: `speaker-name-${MARK}`, title: 'their title', monogram: 'DL', body: 'their bio' }] } },
    { type: 'Prose', props: { id: 'b7', eyebrow: 'eyebrow', heading: `prose-heading-${MARK}`, body: `prose-body-${MARK}`, background: 'white' } },
    { type: 'CtaCard', props: { id: 'b8', eyebrow: 'eyebrow', heading: `cta-heading-${MARK}`, body: `cta-body-${MARK}`, ctaLabel: 'Save my seat', ctaHref: '/register', note: `cta-note-${MARK}` } },
    { type: 'Footer', props: { id: 'b9', copyright: `foot-copy-${MARK}`, links: [{ label: `foot-link-${MARK}`, href: '/privacy' }], note: 'footer note' } },
  ],
}

res = await fetch(`${BASE}/api/builder/${pageId}`, {
  method: 'PUT',
  headers: H(mate),
  body: JSON.stringify({ content: layout }),
})
check(res.ok, 'can save a draft', `${res.status}`)

res = await fetch(`${BASE}/api/builder/${pageId}`, {
  method: 'PUT',
  headers: H(mate),
  body: JSON.stringify({ content: layout, publish: true }),
})
check(res.status === 403, 'CANNOT publish', `${res.status}`)

// Refused rather than silently downgraded: someone told "saved" would believe
// their page was live.
const refusal = await res.json().catch(() => ({}))
check(
  typeof refusal.error === 'string' && /publish/i.test(refusal.error),
  'the refusal explains itself',
  refusal.error,
)

console.log('\nprivilege escalation')

const me = await (await fetch(`${BASE}/api/users/me`, { headers: H(mate) })).json()
await fetch(`${BASE}/api/users/${me.user.id}`, {
  method: 'PATCH',
  headers: H(mate),
  body: JSON.stringify({ roles: ['admin', 'member'] }),
})
const afterSelfPromote = await (await fetch(`${BASE}/api/users/me`, { headers: H(mate) })).json()
check(
  !(afterSelfPromote.user.roles || []).includes('admin'),
  'a teammate cannot make themselves an admin',
  `roles=${afterSelfPromote.user.roles}`,
)

const userList = await (await fetch(`${BASE}/api/users?limit=100`, { headers: H(mate) })).json()
check(
  (userList.docs || []).length === 1,
  'a teammate without users:manage sees only themselves',
  `${(userList.docs || []).length} user(s)`,
)

const roleWrite = await fetch(`${BASE}/api/roles`, {
  method: 'POST',
  headers: H(mate),
  body: JSON.stringify({ name: 'Invented role', capabilities: ['users:manage'] }),
})
check(roleWrite.status >= 400, 'a teammate cannot invent a role for themselves', `${roleWrite.status}`)

console.log('\na plain member has no builder at all')

res = await fetch(`${BASE}/api/builder/new`, { method: 'POST', headers: H(member), redirect: 'manual' })
check(res.status === 401, 'cannot create a page', `${res.status}`)
res = await fetch(`${BASE}/api/builder/${pageId}`, {
  method: 'PUT',
  headers: H(member),
  body: JSON.stringify({ content: layout }),
})
check(res.status === 401, 'cannot save a page', `${res.status}`)

res = await fetch(`${BASE}/api/builder/${pageId}`, {
  method: 'PUT',
  headers: H(null),
  body: JSON.stringify({ content: layout }),
})
check(res.status === 401, 'nor can an anonymous caller', `${res.status}`)

// --- drafts are private -------------------------------------------------

console.log('\ndrafts')

const page = await (await fetch(`${BASE}/api/pages/${pageId}`, { headers: H(admin) })).json()
const slug = page.slug
res = await fetch(`${BASE}/p/${slug}`)
check(res.status === 404, 'a draft 404s for the public', `${res.status}`)

// A 404 rather than a 403: a 403 confirms the page exists, which leaks an
// unannounced launch to anyone guessing URLs.
res = await fetch(`${BASE}/p/${slug}`, { headers: { Cookie: mate.cookie, Origin: BASE } })
check(res.status === 200, 'but the team can preview it', `${res.status}`)

// --- publishing ---------------------------------------------------------

console.log('\npublishing, and every block rendering')

res = await fetch(`${BASE}/api/builder/${pageId}`, {
  method: 'PUT',
  headers: H(admin),
  body: JSON.stringify({ content: layout, publish: true }),
})
const published = await res.json().catch(() => ({}))
check(res.ok && published.status === 'published', 'an admin can publish', `${res.status}`)

res = await fetch(`${BASE}/p/${slug}`)
const html = await res.text()
check(res.status === 200, 'the published page is public', `${res.status}`)

/**
 * Two markers per block: a piece of text that came from props, and the wrapper
 * class that came from the design system. Together they catch both halves of a
 * silent failure — a block that renders nothing, and a block that renders with
 * the wrong class and therefore unstyled.
 */
const EXPECT = {
  Hero: [`hero-heading-${MARK}`, 'class="slot hero"'],
  HostedBy: [`host-name-${MARK}`, 'class="hostbar"'],
  DarkCard: [`dark-kicker-${MARK}`, 'class="card-dark"'],
  BulletList: [`bullet-lead-${MARK}`, 'class="bullets"'],
  FormulaBar: [`result-${MARK}`, 'class="fbar"'],
  CardRow: [`card-title-${MARK}`, 'class="cols-2"'],
  Speakers: [`speaker-name-${MARK}`, 'class="speakers"'],
  Prose: [`prose-body-${MARK}`, 'class="eyebrow"'],
  CtaCard: [`cta-note-${MARK}`, 'class="finalcard"'],
  Footer: [`foot-link-${MARK}`, 'class="foot-in"'],
}
for (const [block, [text, className]] of Object.entries(EXPECT)) {
  check(html.includes(text), `${block} renders its content`, text)
  check(html.includes(className), `${block} uses the design system`, className)
}

/**
 * Two paragraphs from one textarea, split on the blank line.
 *
 * Asserted on the markup, not on a count of the words: Next inlines the RSC
 * flight payload into the same document, so every string appears twice and a
 * count-based check fails while the page is perfectly correct.
 */
check(
  html.includes('<p>first para</p>') && html.includes('<p>second para</p>'),
  'a blank line becomes a new paragraph',
)

// The whole point of the preset library: blocks cannot go off-brand because they
// have no styling of their own. If a block ever hard-codes a colour, this fails.
check(!/style="[^"]*(color|background)\s*:/i.test(html), 'no block hard-codes a colour inline')

/**
 * The builder's own bundle must never reach a visitor. Rendering through Puck's
 * RSC entry point is what keeps it server-side; if someone ever swaps `Render`
 * for the client import, a landing page silently gains a few hundred kilobytes
 * of editor and this fails.
 */
check(!html.includes('@measured/puck/dist/index'), 'the published page does not ship the editor bundle')

// --- rubbish in ---------------------------------------------------------

console.log('\nbad input')

res = await fetch(`${BASE}/api/builder/${pageId}`, {
  method: 'PUT',
  headers: H(admin),
  body: JSON.stringify({ content: { nope: true } }),
})
check(res.status === 400, 'a layout of the wrong shape is rejected', `${res.status}`)

res = await fetch(`${BASE}/p/${slug}`)
check((await res.text()).includes('class="finalcard"'), 'and the live page is undamaged')

res = await fetch(`${BASE}/api/builder/not-a-number`, {
  method: 'PUT',
  headers: H(admin),
  body: JSON.stringify({ content: layout }),
})
check(res.status === 400, 'a non-numeric page id is rejected', `${res.status}`)

// --- the admin door -----------------------------------------------------

console.log('\nthe admin panel')

res = await fetch(`${BASE}/builder`, { headers: { Cookie: member.cookie, Origin: BASE }, redirect: 'manual' })
check(res.status === 307 || res.status === 302, 'a member is redirected away from /builder', `${res.status}`)
res = await fetch(`${BASE}/builder`, { headers: { Origin: BASE }, redirect: 'manual' })
check(res.status === 307 || res.status === 302, 'so is an anonymous visitor', `${res.status}`)
res = await fetch(`${BASE}/builder`, { headers: { Cookie: mate.cookie, Origin: BASE } })
check(res.status === 200, 'the page editor gets in', `${res.status}`)

// Clickjacking an authenticated admin session is a real attack; these must be set.
res = await fetch(`${BASE}/admin`)
check(res.headers.get('x-frame-options') === 'DENY', '/admin refuses to be framed', res.headers.get('x-frame-options'))
check(
  (res.headers.get('content-security-policy') || '').includes("frame-ancestors 'none'"),
  '/admin sets frame-ancestors none',
)

console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
