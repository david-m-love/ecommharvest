/**
 * Registration logic: validation, spam handling, rate limiting, and sink
 * fan-out. Ported from the pre-Payload version — the assertions are the same,
 * but they now call processRegistration() directly instead of driving a mocked
 * req/res pair, which is what the refactor into src/lib/registration.ts bought.
 *
 *   npx tsx test/registration.test.ts
 *
 * The database sink stays switched off here (DATABASE_URI unset), so this runs
 * with no Postgres and no network.
 */
import assert from 'node:assert/strict'

import type { RegistrationInput, RequestMeta } from '@/lib/registration'

const OLD_ENOUGH = Date.now() - 60_000 // past the minimum fill time

const calls: { url: string; body?: string }[] = []

const stubFetch = ({ fail = [] as string[] } = {}) => {
  calls.length = 0
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const u = String(url)
    calls.push({ url: u, body: init?.body as string })
    const which = u.includes('klaviyo') ? 'klaviyo' : u.includes('hooks.example') ? 'webhook' : 'kv'
    if (fail.includes(which)) return { ok: false, status: 500, text: async () => 'boom' }
    if (which === 'kv') {
      const cmd = JSON.parse(init!.body as string)[0]
      return { ok: true, status: 200, json: async () => ({ result: cmd === 'INCR' ? 1 : 1 }) }
    }
    return { ok: true, status: 202, json: async () => ({}), text: async () => '' }
  }) as unknown as typeof fetch
}

const ENV_KEYS = [
  'DATABASE_URI',
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN',
  'KLAVIYO_PRIVATE_KEY',
  'KLAVIYO_LIST_ID',
  'REGISTRATION_WEBHOOK_URL',
]
const setEnv = (env: Record<string, string>) => {
  for (const k of ENV_KEYS) delete process.env[k]
  Object.assign(process.env, env)
}

// The module reads env at call time, so one import is enough.
const { processRegistration } = await import('@/lib/registration')

const KV = { KV_REST_API_URL: 'https://kv.example/', KV_REST_API_TOKEN: 'tok' }
const KLAVIYO = { KLAVIYO_PRIVATE_KEY: 'pk_test', KLAVIYO_LIST_ID: 'ABC123' }
const HOOK = { REGISTRATION_WEBHOOK_URL: 'https://hooks.example/reg' }

const META: RequestMeta = { ip: '203.0.113.10', userAgent: 'test-agent', referer: 'https://ref' }
const VALID: RegistrationInput = {
  name: 'David',
  email: 'David@Example.com',
  storeUrl: 'example.com',
  consent: true,
  company: '',
  t: OLD_ENOUGH,
}

let passed = 0
const test = async (label: string, fn: () => Promise<void>) => {
  try {
    await fn()
    console.log(`  ok  ${label}`)
    passed++
  } catch (err) {
    console.error(`FAIL  ${label}\n      ${(err as Error).message}`)
    process.exitCode = 1
  }
}

console.log('src/lib/registration.ts')

await test('503 when no sink is configured, rather than dropping the lead', async () => {
  setEnv({})
  stubFetch()
  const r = await processRegistration(VALID, META)
  assert.equal(r.status, 503)
  assert.equal(r.body.ok, false)
  assert.equal(calls.length, 0)
})

await test('accepts a valid registration and writes to KV', async () => {
  setEnv(KV)
  stubFetch()
  const r = await processRegistration(VALID, META)
  assert.equal(r.status, 200, JSON.stringify(r.body))
  const push = calls.find((c) => c.body?.includes('LPUSH'))
  assert.ok(push, 'expected an LPUSH')
  const stored = JSON.parse(JSON.parse(push!.body!)[2])
  assert.equal(stored.email, 'david@example.com', 'email should be lowercased')
  assert.equal(stored.name, 'David')
  assert.equal(stored.ip, '203.0.113.10')
  assert.equal(stored.event, 'q4-masterclass-2026-09-03', 'defaults to the current event')
})

await test('missing name, bad email and no consent report per-field errors', async () => {
  setEnv(KV)
  stubFetch()
  const r = await processRegistration({ ...VALID, name: 'D', email: 'nope', consent: false }, META)
  assert.equal(r.status, 422)
  assert.deepEqual(Object.keys(r.body.errors!).sort(), ['consent', 'email', 'name'])
})

await test('consent accepts the checkbox "on" as well as true', async () => {
  setEnv(KV)
  stubFetch()
  assert.equal((await processRegistration({ ...VALID, consent: 'on' }, META)).status, 200)
  assert.equal((await processRegistration({ ...VALID, consent: 'false' }, META)).status, 422)
})

await test('honeypot submission looks successful but is never stored', async () => {
  setEnv(KV)
  stubFetch()
  const r = await processRegistration({ ...VALID, company: 'bot corp' }, META)
  assert.equal(r.status, 200)
  assert.equal(r.body.ok, true)
  assert.equal(calls.length, 0, 'nothing should be written')
})

await test('instant submission is treated as a bot', async () => {
  setEnv(KV)
  stubFetch()
  const r = await processRegistration({ ...VALID, t: Date.now() }, META)
  assert.equal(r.status, 200)
  assert.equal(calls.length, 0)
})

await test('a missing timestamp does not trip the bot check', async () => {
  setEnv(KV)
  stubFetch()
  const { t: _t, ...noTimestamp } = VALID
  assert.equal((await processRegistration(noTimestamp, META)).status, 200)
  assert.ok(calls.some((c) => c.body?.includes('LPUSH')))
})

await test('over the rate limit returns 429', async () => {
  setEnv(KV)
  calls.length = 0
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const cmd = JSON.parse(init!.body as string)[0]
    calls.push({ url: String(url), body: init!.body as string })
    return { ok: true, status: 200, json: async () => ({ result: cmd === 'INCR' ? 99 : 1 }) }
  }) as unknown as typeof fetch
  assert.equal((await processRegistration(VALID, META)).status, 429)
})

await test('a broken rate limiter allows the registration through', async () => {
  setEnv({ ...KV, ...HOOK })
  calls.length = 0
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const u = String(url)
    calls.push({ url: u, body: init?.body as string })
    if (u.includes('kv.example')) return { ok: false, status: 500, text: async () => 'down' }
    return { ok: true, status: 200, json: async () => ({}) }
  }) as unknown as typeof fetch
  const r = await processRegistration(VALID, META)
  assert.equal(r.status, 200, 'KV being down must not block a real lead')
})

await test('all configured sinks fire', async () => {
  setEnv({ ...KV, ...KLAVIYO, ...HOOK })
  stubFetch()
  const r = await processRegistration(VALID, META)
  assert.equal(r.status, 200)
  assert.ok(calls.some((c) => c.url.includes('klaviyo')), 'klaviyo not called')
  assert.ok(calls.some((c) => c.url.includes('hooks.example')), 'webhook not called')
  assert.ok(calls.some((c) => c.body?.includes('LPUSH')), 'kv not called')
})

await test('klaviyo payload carries email, consent and the list id', async () => {
  setEnv(KLAVIYO)
  stubFetch()
  await processRegistration(VALID, META)
  const k = calls.find((c) => c.url.includes('klaviyo'))!
  const profile = JSON.parse(k.body!).data.attributes.profiles.data[0].attributes
  assert.equal(profile.email, 'david@example.com')
  assert.equal(profile.subscriptions.email.marketing.consent, 'SUBSCRIBED')
  assert.equal(JSON.parse(k.body!).data.relationships.list.data.id, 'ABC123')
})

await test('one failing sink still succeeds if another works', async () => {
  setEnv({ ...KV, ...KLAVIYO })
  stubFetch({ fail: ['klaviyo'] })
  assert.equal((await processRegistration(VALID, META)).status, 200)
})

await test('502 only when every sink fails', async () => {
  setEnv({ ...KLAVIYO, ...HOOK })
  stubFetch({ fail: ['klaviyo', 'webhook'] })
  const r = await processRegistration(VALID, META)
  assert.equal(r.status, 502)
  assert.equal(r.body.ok, false)
})

await test('oversized input is truncated, not rejected', async () => {
  setEnv(KV)
  stubFetch()
  await processRegistration({ ...VALID, name: 'A'.repeat(500) }, META)
  const push = calls.find((c) => c.body?.includes('LPUSH'))!
  assert.equal(JSON.parse(JSON.parse(push.body!)[2]).name.length, 100)
})

await test('non-string fields are rejected rather than coerced', async () => {
  setEnv(KV)
  stubFetch()
  const r = await processRegistration({ ...VALID, name: { evil: true }, email: 42 }, META)
  assert.equal(r.status, 422)
  assert.ok(r.body.errors!.name && r.body.errors!.email)
})

await test('a custom event tag is preserved', async () => {
  setEnv(KV)
  stubFetch()
  await processRegistration({ ...VALID, event: 'spring-workshop-2027' }, META)
  const push = calls.find((c) => c.body?.includes('LPUSH'))!
  assert.equal(JSON.parse(JSON.parse(push.body!)[2]).event, 'spring-workshop-2027')
})

console.log(`\n${passed} passed`)
