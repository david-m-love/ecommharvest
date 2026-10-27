/**
 * Signing in by clicking the emailed link — the way a member actually does it.
 *
 *   npm run dev        # in another terminal, migrated and seeded
 *   npm run test:signin
 *
 * This exists because the first version of passwordless sign-in passed every
 * test it had and did not work for a single real person. Every earlier check
 * either called the API with an `Origin` header or navigated within the same
 * site, and neither is what happens when somebody clicks a link in Gmail.
 *
 * What goes wrong: the click is a *cross-site* navigation. Payload only trusts a
 * session cookie on a request with no `Origin` header (every ordinary page view)
 * when the browser says `Sec-Fetch-Site` is same-origin, same-site or none — and
 * a redirect chain that began on another site stays "cross-site" for every hop.
 * So `/api/auth/verify` set a perfectly good cookie, redirected to `/learn`, and
 * `/learn` was handed that cookie and threw it away. The member landed back on
 * the login form having done everything right.
 *
 * So this test clicks from a page on a *different site* — `127.0.0.1` against
 * `localhost` — which is the only way to get a browser to say "cross-site".
 */
import http from 'node:http'
import { chromium } from 'playwright'
import pg from 'pg'
import 'dotenv/config'

const B = process.env.TEST_BASE_URL || 'http://localhost:3000'
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

/**
 * Reads the most recent link token for an address straight from the KV table.
 *
 * In production the link is only ever emailed, and the dev-server console is not
 * something a test should scrape. `magic-recent:` is the index the reuse window
 * keeps, so it holds exactly the token that was just issued.
 */
const db = new pg.Client({ connectionString: process.env.DATABASE_URI })
await db.connect()
const latestToken = async (email) => {
  const { rows } = await db.query('select data from payload_kv where key = $1', [
    `magic-recent:${email.toLowerCase()}`,
  ])
  return rows[0]?.data?.token ?? null
}

const requestLink = async (email, next) => {
  const res = await fetch(`${B}/api/auth/request-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...H },
    body: JSON.stringify({ email, next }),
  })
  if (!res.ok) throw new Error(`request-link answered ${res.status}`)
  const token = await latestToken(email)
  if (!token) throw new Error('no token was issued')
  return token
}

/**
 * A request with exactly the headers given, and no others added.
 *
 * Not `fetch`: Node's fetch is a spec-compliant one and quietly sets
 * `Sec-Fetch-Mode: cors` on every request whatever you ask for, which turns a
 * simulated link click into a simulated script — and a test that passes or fails
 * for the wrong reason is worse than none. `http.request` sends what it is told.
 */
const raw = (method, path, headers, body) =>
  new Promise((resolve, reject) => {
    const url = new URL(path, B)
    const req = http.request(
      { host: url.hostname, port: url.port, path: url.pathname + url.search, method, headers },
      (res) => {
        res.resume()
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }))
      },
    )
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })

/** A page on a *different site* that does nothing but link to the sign-in URL. */
const otherSite = http.createServer((req, res) => {
  const target = new URL(req.url, 'http://x').searchParams.get('to') || '/'
  res.setHeader('Content-Type', 'text/html')
  res.end(`<!doctype html><title>Your inbox</title><a id="go" href="${target}">Sign in to eCommHarvest</a>`)
})
await new Promise((resolve) => otherSite.listen(4010, '127.0.0.1', resolve))
const OTHER = 'http://127.0.0.1:4010'

/**
 * A fresh address per check. Two reasons: the hourly cap is five link requests
 * per address, and a fresh address means each check starts from a token nobody
 * has touched. Accounts are created on demand by the sign-in flow itself, which
 * is exactly how a real first-time member arrives.
 */
let n = 0
const fresh = () => `signin-${Date.now()}-${n++}@example.test`

/** Clicks the emailed link from the other site and reports where it ended up. */
const clickFromEmail = async (token, { context } = {}) => {
  const ctx = context || (await browser.newContext())
  const page = await ctx.newPage()
  const link = `${B}/api/auth/verify?token=${encodeURIComponent(token)}`
  await page.goto(`${OTHER}/?to=${encodeURIComponent(link)}`)
  await page.click('#go')
  // Follow whatever chain results, including a confirm step if there is one.
  await page.waitForLoadState('networkidle')
  const confirm = page.locator('form[action="/api/auth/verify"] button[type=submit]')
  if (await confirm.count()) {
    await confirm.first().click()
    await page.waitForLoadState('networkidle')
  }
  return { ctx, page }
}

console.log('\nclicking the emailed link from another site')
{
  const EMAIL = fresh()
  const token = await requestLink(EMAIL, '/community')
  const { ctx, page } = await clickFromEmail(token)
  const path = new URL(page.url()).pathname
  check(
    path !== '/login',
    'the member is not sent back to the login form',
    `landed on ${path}${new URL(page.url()).search}`,
  )
  // /community answers 200 for a signed-in non-member too (the locked page), so
  // this asserts the session itself rather than the room behind it.
  const me = await ctx.request.get(`${B}/api/users/me`, { headers: H })
  const who = (await me.json().catch(() => ({}))).user?.email
  check(who === EMAIL, 'and the session is real', who || 'signed out')
  await ctx.close()
}

console.log('\nthe link is single-use')
{
  const token = await requestLink(fresh())
  const first = await clickFromEmail(token)
  check(new URL(first.page.url()).pathname !== '/login', 'the first click signs in')
  await first.ctx.close()

  const second = await clickFromEmail(token)
  const url = new URL(second.page.url())
  check(
    url.pathname === '/login' && url.searchParams.get('error') === 'expired',
    'a second use is refused',
    `${url.pathname}${url.search}`,
  )
  await second.ctx.close()
}

console.log('\na mail scanner opening the link must not spend it')
{
  /**
   * Corporate and consumer mail systems fetch links to check them, with a plain
   * GET and no person involved. If that consumed the token, the member would
   * click a link that had already been used and see "expired" on their first try.
   */
  const token = await requestLink(fresh())
  const scan = await fetch(`${B}/api/auth/verify?token=${encodeURIComponent(token)}`, {
    redirect: 'manual',
  })
  check(scan.status === 200, 'a bare GET shows a page and does not redirect', String(scan.status))
  const stillGood = await clickFromEmail(token)
  check(
    new URL(stillGood.page.url()).pathname !== '/login',
    'and the real click afterwards still works',
    new URL(stillGood.page.url()).pathname,
  )
  await stillGood.ctx.close()
}

console.log('\nsigning in on behalf of somebody else')
{
  /**
   * The confirm step is a POST, which makes it a login-CSRF target: an attacker
   * who requests a link for their own account could trick a victim's browser
   * into submitting it, signing the victim into the attacker's account. A POST
   * from another origin has to be refused.
   */
  const token = await requestLink(fresh())
  const res = await fetch(`${B}/api/auth/verify`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://evil.example' },
    body: `token=${encodeURIComponent(token)}`,
  })
  check(res.status === 403, 'a POST from another origin is refused', String(res.status))
  const after = await clickFromEmail(token)
  check(
    new URL(after.page.url()).pathname !== '/login',
    'and the refused attempt did not spend the token',
  )
  await after.ctx.close()
}

console.log('\nthe link must not carry people anywhere off-site')
{
  /**
   * `/\evil.example/phish` is the one the old check let through: it starts with a
   * slash and not two, and browsers read the backslash as a slash, so it
   * resolved to another site. Tried through the front door first.
   */
  for (const hostile of ['//evil.example/phish', '/\\evil.example/phish']) {
    const token = await requestLink(fresh(), hostile)
    const { ctx, page } = await clickFromEmail(token)
    check(
      new URL(page.url()).origin === new URL(B).origin,
      `a hostile next is ignored when asked for: ${hostile}`,
      page.url(),
    )
    await ctx.close()
  }

  /**
   * And the other door. A token is stored fifteen minutes before it is used, so
   * verify cannot assume the request route vetted it: a link issued before a fix
   * is still sitting in the store, carrying whatever it was given. Planting one
   * directly is the only way to test that verify checks for itself.
   */
  const planted = `planted-${Date.now()}-${'x'.repeat(24)}`
  const email = fresh()
  await requestLink(email) // creates the account
  await db.query('insert into payload_kv (key, data) values ($1, $2)', [
    `magic:${planted}`,
    JSON.stringify({ email, expiresAt: Date.now() + 600_000, next: '/\\evil.example/phish' }),
  ])
  const { ctx, page } = await clickFromEmail(planted)
  check(
    new URL(page.url()).origin === new URL(B).origin,
    'verify refuses a hostile next that was already in the store',
    page.url(),
  )
  await ctx.close()
}

console.log('\nfollowing a link while signed in')
{
  /**
   * The second half of the same bug. Signing in worked; the next link followed
   * from an email, Slack or a campaign did not, because the browser calls that a
   * cross-site navigation and Payload discards the session cookie on those. A
   * member arriving from a reminder email landed on the login form holding a
   * valid session.
   */
  const member = fresh()
  const token = await requestLink(member)
  const first = await clickFromEmail(token)
  check(new URL(first.page.url()).pathname === '/learn', 'signed in')

  for (const path of ['/learn', '/community']) {
    const page = await first.ctx.newPage()
    await page.goto(`${OTHER}/?to=${encodeURIComponent(B + path)}`)
    await page.click('#go')
    await page.waitForLoadState('networkidle')
    check(
      new URL(page.url()).pathname !== '/login',
      `a link from another site to ${path} keeps the member signed in`,
      new URL(page.url()).pathname,
    )
    await page.close()
  }
  await first.ctx.close()
}

console.log('\nbut only a link — nothing else may borrow the session')
{
  /**
   * The relaxation has to be exactly as wide as a person clicking a link and no
   * wider. These send a real session cookie with the headers each kind of
   * cross-site request carries, and every one except the link must be treated as
   * signed out.
   */
  const member = fresh()
  const token = await requestLink(member)
  const signIn = await fetch(`${B}/api/auth/verify`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: B },
    body: `token=${encodeURIComponent(token)}`,
  })
  const cookie = (signIn.headers.getSetCookie?.() || [])
    .map((c) => c.split(';')[0])
    .find((c) => c.startsWith('payload-token='))
  check(Boolean(cookie), 'the sign-in POST sets a session cookie')

  const asRequest = async (label, headers, expectSignedIn) => {
    const res = await raw('GET', '/learn', {
      Host: new URL(B).host,
      Cookie: cookie,
      'Sec-Fetch-Site': 'cross-site',
      ...headers,
    })
    const signedIn = res.status === 200
    check(signedIn === expectSignedIn, label, `${res.status}`)
  }

  await asRequest(
    'a cross-site link click is signed in',
    { 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document' },
    true,
  )
  await asRequest(
    'a cross-site iframe is not',
    { 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'iframe' },
    false,
  )
  await asRequest(
    'a cross-site fetch() is not',
    { 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Dest': 'empty' },
    false,
  )
  await asRequest(
    'a cross-site navigation carrying a foreign Origin is not',
    { 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document', Origin: 'https://evil.example' },
    false,
  )

  // And the write path, which is where it would matter. A forged form POST from
  // another site carries a foreign Origin; it must act as nobody.
  const payloadBody = JSON.stringify({ title: 'Forged from another site', body: 'should never exist' })
  const forged = await raw(
    'POST',
    '/api/community/threads',
    {
      Host: new URL(B).host,
      Cookie: cookie,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payloadBody),
      Origin: 'https://evil.example',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Dest': 'document',
    },
    payloadBody,
  )
  check(forged.status === 401, 'a forged cross-site POST acts as nobody', `${forged.status}`)
}

otherSite.close()
await db.end()
await browser.close()
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
