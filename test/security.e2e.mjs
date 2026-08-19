/**
 * End-to-end security boundaries, run against a live server.
 *
 *   npm run dev            # in one terminal
 *   npm run test:security  # in another
 *
 * Every request sets an Origin header on purpose: Payload only honours cookie
 * auth for origins listed in `csrf`, so without it every call reads as
 * unauthenticated and the whole suite passes for the wrong reason.
 *
 * Requires the seed data (npm run seed).
 */
import { chromium } from 'playwright'

const B = process.env.BASE_URL || 'http://localhost:3000'
// Sandboxes and CI images often ship a Chromium that does not match the version
// Playwright expects. PLAYWRIGHT_CHROMIUM_PATH points at it; otherwise
// Playwright resolves its own bundled browser as normal.
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
  : {}
// Playwright's request client sends no Origin, and Payload refuses cookie auth
// without one — so every request here sets it, or the results are meaningless.
const H = { Origin: B }
const browser = await chromium.launch(launchOptions)

const ctxFor = async (email) => {
  const ctx = await browser.newContext()
  const r = await ctx.request.post(`${B}/api/users/login`, {
    data: { email, password: 'change-me-locally-8f2a' }, headers: H,
  })
  if (!r.ok()) throw new Error(`login ${email}: ${r.status()}`)
  return ctx
}
const anon = await browser.newContext()
const member = await ctxFor('member@example.com')
const admin = await ctxFor('david@lovemarketing.digital')

const check = async (label, ctx, method, path, data, expect) => {
  const r = await ctx.request.fetch(`${B}${path}`, { method, data, headers: H, maxRedirects: 0 })
  const got = r.status()
  const pass = Array.isArray(expect) ? expect.includes(got) : got === expect
  console.log(`${pass ? ' ok ' : 'FAIL'} ${label.padEnd(52)} ${got} (expect ${expect})`)
  return got
}

console.log('admin endpoints')
await check('anon    -> POST /api/admin/access',      anon,   'POST', '/api/admin/access',      { userId: 2, courseId: 1, action: 'grant' }, 401)
await check('member  -> POST /api/admin/access',      member, 'POST', '/api/admin/access',      { userId: 2, courseId: 1, action: 'grant' }, 401)
await check('admin   -> POST /api/admin/access',      admin,  'POST', '/api/admin/access',      { userId: 2, courseId: 1, action: 'grant' }, 200)
await check('member  -> POST /api/admin/impersonate', member, 'POST', '/api/admin/impersonate', { userId: 1 }, 401)
await check('admin   -> impersonate an ADMIN',        admin,  'POST', '/api/admin/impersonate', { userId: 1 }, 403)
// In a throwaway context: impersonation deliberately REPLACES the caller's own
// session, so reusing `admin` afterwards would silently test as a member.
const throwaway = await ctxFor('david@lovemarketing.digital')
await check('admin   -> impersonate a MEMBER',        throwaway, 'POST', '/api/admin/impersonate', { userId: 2 }, [307, 200])
const afterMe = await throwaway.request.get(`${B}/api/users/me`, { headers: H })
const who = (await afterMe.json()).user?.email
console.log(` ${who === 'member@example.com' ? 'ok ' : 'FAIL'} session after impersonating: ${who} (expect member@example.com)`)
await check('member  -> POST /api/admin/upload',      member, 'POST', '/api/admin/upload',      { lessonId: 1 }, 401)
await check('admin   -> POST /api/admin/upload (stub)', admin,'POST', '/api/admin/upload',      { lessonId: 1 }, 503)

console.log('\nplayback gate')
await check('anon    -> playback of a non-preview lesson', anon, 'GET', '/api/playback/selling-beyond-25-off', undefined, [401, 409])
await check('member  -> playback of a non-preview lesson', member, 'GET', '/api/playback/selling-beyond-25-off', undefined, [403, 409])

console.log('\nprogress cannot be forged')
await check('anon    -> POST /api/progress', anon, 'POST', '/api/progress', { lessonSlug: 'conversion-checks' }, 401)

console.log('\naudit log')
const r = await admin.request.get(`${B}/api/audit-log?limit=100&sort=-createdAt`, { headers: H })
const log = await r.json()
console.log(` ${typeof log.totalDocs === 'number' ? 'ok ' : 'FAIL'} entries: ${log.totalDocs}`)
if (!Array.isArray(log.docs)) { console.error('  audit read failed:', r.status(), JSON.stringify(log).slice(0, 200)); log.docs = [] }
const counts = {}
for (const d of log.docs) counts[d.action] = (counts[d.action] || 0) + 1
console.log('     actions:', JSON.stringify(counts))
const mr = await member.request.get(`${B}/api/audit-log`, { headers: H })
console.log(` ${mr.status() === 403 ? 'ok ' : 'FAIL'} member reading the audit log: ${mr.status()} (expect 403)`)
// Append-only: even an admin must not be able to write or delete entries.
const cr = await admin.request.post(`${B}/api/audit-log`, { data: { action: 'forged' }, headers: H })
console.log(` ${cr.status() === 403 ? 'ok ' : 'FAIL'} admin forging an audit entry: ${cr.status()} (expect 403)`)
const dr = await admin.request.delete(`${B}/api/audit-log/${log.docs[0]?.id}`, { headers: H })
console.log(` ${dr.status() === 403 ? 'ok ' : 'FAIL'} admin deleting an audit entry: ${dr.status()} (expect 403)`)

await browser.close()
