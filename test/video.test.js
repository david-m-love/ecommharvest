/**
 * Exercises the video adapter against a stubbed fetch: provider selection,
 * Cloudflare state mapping, signed-URL enforcement, and local JWT signing.
 *   node --experimental-strip-types test/video.test.js
 */
import assert from 'node:assert/strict'
import { generateKeyPairSync, createVerify } from 'node:crypto'

const mod = await import('../src/lib/video.ts')
const { getVideoProvider, resetVideoProvider, VideoProviderError } = mod

const calls = []
const ok = (result) => ({ ok: true, status: 200, json: async () => ({ success: true, result }) })

function stubFetch(handler) {
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), method: init?.method || 'GET', body: init?.body, headers: init?.headers })
    return handler(String(url), init)
  }
}

function setEnv(env) {
  for (const k of [
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_STREAM_TOKEN',
    'CLOUDFLARE_STREAM_SIGNING_KEY_ID',
    'CLOUDFLARE_STREAM_SIGNING_KEY_JWK',
  ]) {
    delete process.env[k]
  }
  Object.assign(process.env, env)
  resetVideoProvider()
}

const CF = { CLOUDFLARE_ACCOUNT_ID: 'acct123', CLOUDFLARE_STREAM_TOKEN: 'tok_abc' }

let passed = 0
async function test(label, fn) {
  calls.length = 0
  try {
    await fn()
    console.log(`  ok  ${label}`)
    passed++
  } catch (err) {
    console.error(`FAIL  ${label}\n      ${err.message}`)
    process.exitCode = 1
  }
}

console.log('src/lib/video.ts')

await test('falls back to the stub provider with no credentials', async () => {
  setEnv({})
  const p = getVideoProvider()
  assert.equal(p.name, 'stub')
  assert.equal(p.configured, false)
})

await test('stub refuses uploads with an actionable message, not a silent failure', async () => {
  setEnv({})
  await assert.rejects(() => getVideoProvider().createDirectUpload({ name: 'x' }), (err) => {
    assert.ok(err instanceof VideoProviderError)
    assert.match(err.message, /CLOUDFLARE_ACCOUNT_ID/)
    return true
  })
})

await test('stub reports no video rather than throwing, so admin pages still render', async () => {
  setEnv({})
  assert.deepEqual(await getVideoProvider().getVideo('abc'), { videoId: 'abc', status: 'none' })
})

await test('selects Cloudflare when credentials are present', async () => {
  setEnv(CF)
  const p = getVideoProvider()
  assert.equal(p.name, 'cloudflare-stream')
  assert.equal(p.configured, true)
})

await test('direct upload requires signed URLs — the whole access model depends on it', async () => {
  setEnv(CF)
  stubFetch(() => ok({ uploadURL: 'https://upload.example/one-time', uid: 'vid_1' }))
  const res = await getVideoProvider().createDirectUpload({ name: 'Lesson 1' })
  assert.equal(res.uploadUrl, 'https://upload.example/one-time')
  assert.equal(res.videoId, 'vid_1')
  const sent = JSON.parse(calls[0].body)
  assert.equal(sent.requireSignedURLs, true, 'requireSignedURLs must be set at creation time')
  assert.equal(calls[0].method, 'POST')
  assert.match(calls[0].url, /\/accounts\/acct123\/stream\/direct_upload$/)
})

await test('maps every Cloudflare encoding state onto ours', async () => {
  setEnv(CF)
  const cases = [
    ['ready', 'ready'],
    ['inprogress', 'processing'],
    ['queued', 'processing'],
    ['pendingupload', 'uploading'],
    ['error', 'error'],
    ['something-new', 'processing'],
  ]
  for (const [cf, expected] of cases) {
    stubFetch(() => ok({ status: { state: cf }, duration: 61.4 }))
    const details = await getVideoProvider().getVideo('vid_1')
    assert.equal(details.status, expected, `${cf} should map to ${expected}`)
  }
})

await test('rounds duration and ignores Cloudflare’s -1 placeholder', async () => {
  setEnv(CF)
  stubFetch(() => ok({ status: { state: 'ready' }, duration: 61.6 }))
  assert.equal((await getVideoProvider().getVideo('v')).durationSeconds, 62)

  stubFetch(() => ok({ status: { state: 'inprogress' }, duration: -1 }))
  assert.equal((await getVideoProvider().getVideo('v')).durationSeconds, undefined)
})

await test('surfaces the provider’s error text on failure', async () => {
  setEnv(CF)
  stubFetch(() => ({
    ok: false,
    status: 400,
    json: async () => ({ success: false, errors: [{ message: 'Bad video id' }] }),
  }))
  await assert.rejects(() => getVideoProvider().getVideo('nope'), /Bad video id/)
})

await test('an HTTP 200 with success:false is still treated as failure', async () => {
  setEnv(CF)
  stubFetch(() => ({ ok: true, status: 200, json: async () => ({ success: false, errors: [] }) }))
  await assert.rejects(() => getVideoProvider().getVideo('v'), VideoProviderError)
})

await test('asks Cloudflare to mint a token when no local signing key is set', async () => {
  setEnv(CF)
  stubFetch(() => ok({ token: 'cf-minted-token' }))
  const token = await getVideoProvider().createPlaybackToken('vid_1', 3600)
  assert.equal(token, 'cf-minted-token')
  assert.match(calls[0].url, /\/stream\/vid_1\/token$/)
  const sent = JSON.parse(calls[0].body)
  assert.ok(sent.exp > Math.floor(Date.now() / 1000), 'exp must be in the future')
})

await test('signs locally when a signing key is set, with no API call', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const jwk = privateKey.export({ format: 'jwk' })
  setEnv({
    ...CF,
    CLOUDFLARE_STREAM_SIGNING_KEY_ID: 'key_1',
    CLOUDFLARE_STREAM_SIGNING_KEY_JWK: Buffer.from(JSON.stringify(jwk)).toString('base64'),
  })
  stubFetch(() => {
    throw new Error('must not call the API when signing locally')
  })

  const token = await getVideoProvider().createPlaybackToken('vid_xyz', 600)
  assert.equal(calls.length, 0, 'no network call expected')

  const [h, pl, sig] = token.split('.')
  const header = JSON.parse(Buffer.from(h, 'base64url').toString())
  const claims = JSON.parse(Buffer.from(pl, 'base64url').toString())
  assert.equal(header.alg, 'RS256')
  assert.equal(header.kid, 'key_1')
  assert.equal(claims.sub, 'vid_xyz', 'token must be scoped to one video')
  assert.equal(claims.kid, 'key_1')
  const now = Math.floor(Date.now() / 1000)
  assert.ok(claims.exp > now && claims.exp <= now + 601, 'exp must respect the requested TTL')

  // Cryptographically verify, not just structurally.
  const verifier = createVerify('RSA-SHA256')
  verifier.update(`${h}.${pl}`)
  assert.ok(
    verifier.verify(publicKey, Buffer.from(sig, 'base64url')),
    'signature must verify against the public key',
  )
})

await test('accepts a raw JSON signing key as well as base64', async () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  setEnv({
    ...CF,
    CLOUDFLARE_STREAM_SIGNING_KEY_ID: 'key_2',
    CLOUDFLARE_STREAM_SIGNING_KEY_JWK: JSON.stringify(privateKey.export({ format: 'jwk' })),
  })
  const token = await getVideoProvider().createPlaybackToken('v2', 60)
  assert.equal(token.split('.').length, 3)
})

await test('playback and thumbnail URLs use the token in place of the video id', async () => {
  setEnv(CF)
  const p = getVideoProvider()
  assert.equal(
    p.playbackUrl('vid_1', 'tok'),
    'https://customer-acct123.cloudflarestream.com/tok/iframe',
  )
  assert.match(p.thumbnailUrl('vid_1', 'tok'), /\/tok\/thumbnails\/thumbnail\.jpg$/)
  // Without a token it falls back to the id, which only works for unsigned videos.
  assert.match(p.playbackUrl('vid_1'), /\/vid_1\/iframe$/)
})

await test('delete issues a DELETE to the right video', async () => {
  setEnv(CF)
  stubFetch(() => ok({}))
  await getVideoProvider().deleteVideo('vid_9')
  assert.equal(calls[0].method, 'DELETE')
  assert.match(calls[0].url, /\/stream\/vid_9$/)
})

await test('provider is memoised until explicitly reset', async () => {
  setEnv(CF)
  assert.equal(getVideoProvider(), getVideoProvider())
  resetVideoProvider()
  assert.equal(getVideoProvider().name, 'cloudflare-stream')
})

console.log(`\n${passed} passed`)
