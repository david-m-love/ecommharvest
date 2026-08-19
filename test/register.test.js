// Exercises api/register.js against a fake req/res and a stubbed fetch, so the
// validation, spam, and sink-fanout logic is verified without deploying.
//   node test/register.test.js

import assert from 'node:assert/strict';

const OLD_FILL_MS = Date.now() - 60_000; // past the min-fill-time gate

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
    send(b) {
      this.body = b;
      return this;
    },
  };
  return res;
}

function mockReq(body, { method = 'POST', headers = {} } = {}) {
  return {
    method,
    body,
    headers: { 'user-agent': 'test-agent', ...headers },
    socket: { remoteAddress: '203.0.113.10' },
  };
}

const calls = [];
function stubFetch({ fail = [] } = {}) {
  globalThis.fetch = async (url, opts) => {
    calls.push({ url: String(url), body: opts?.body });
    const which = String(url).includes('klaviyo')
      ? 'klaviyo'
      : String(url).includes('hooks.example')
        ? 'webhook'
        : 'kv';
    if (fail.includes(which)) {
      return { ok: false, status: 500, text: async () => 'boom' };
    }
    if (which === 'kv') {
      const cmd = JSON.parse(opts.body)[0];
      // INCR returns the hit count; everything else just needs to succeed.
      return { ok: true, status: 200, json: async () => ({ result: cmd === 'INCR' ? 1 : 1 }) };
    }
    return { ok: true, status: 202, json: async () => ({}), text: async () => '' };
  };
}

function setEnv(env) {
  for (const k of [
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
    'KLAVIYO_PRIVATE_KEY',
    'KLAVIYO_LIST_ID',
    'REGISTRATION_WEBHOOK_URL',
  ]) {
    delete process.env[k];
  }
  Object.assign(process.env, env);
}

// register.js reads env at module scope, so each env permutation needs a fresh import.
async function loadHandler() {
  const mod = await import(`../api/register.js?v=${Math.random()}`);
  return mod.default;
}

const valid = {
  name: 'David',
  email: 'David@Example.com',
  storeUrl: 'example.com',
  consent: true,
  company: '',
  t: OLD_FILL_MS,
};

let passed = 0;
async function test(label, fn) {
  calls.length = 0;
  try {
    await fn();
    console.log(`  ok  ${label}`);
    passed++;
  } catch (err) {
    console.error(`FAIL  ${label}\n      ${err.message}`);
    process.exitCode = 1;
  }
}

const KV = { KV_REST_API_URL: 'https://kv.example/', KV_REST_API_TOKEN: 'tok' };
const KLAVIYO = { KLAVIYO_PRIVATE_KEY: 'pk_test', KLAVIYO_LIST_ID: 'ABC123' };
const HOOK = { REGISTRATION_WEBHOOK_URL: 'https://hooks.example/reg' };

console.log('api/register.js');

await test('rejects non-POST with 405', async () => {
  setEnv(KV);
  stubFetch();
  const res = mockRes();
  await (await loadHandler())(mockReq(valid, { method: 'GET' }), res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, 'POST');
});

await test('503 when no sink is configured, rather than silently dropping the lead', async () => {
  setEnv({});
  stubFetch();
  const res = mockRes();
  await (await loadHandler())(mockReq(valid), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.ok, false);
  assert.equal(calls.length, 0);
});

await test('accepts a valid registration and writes to KV', async () => {
  setEnv(KV);
  stubFetch();
  const res = mockRes();
  await (await loadHandler())(mockReq(valid), res);
  assert.equal(res.statusCode, 200, `got ${res.statusCode} ${JSON.stringify(res.body)}`);
  assert.equal(res.body.ok, true);
  const push = calls.find((c) => c.body?.includes('LPUSH'));
  assert.ok(push, 'expected an LPUSH');
  const stored = JSON.parse(JSON.parse(push.body)[2]);
  assert.equal(stored.email, 'david@example.com', 'email should be lowercased');
  assert.equal(stored.name, 'David');
  assert.equal(stored.ip, '203.0.113.10');
});

await test('missing name, bad email, and no consent all report per-field errors', async () => {
  setEnv(KV);
  stubFetch();
  const res = mockRes();
  await (await loadHandler())(
    mockReq({ ...valid, name: 'D', email: 'not-an-email', consent: false }),
    res,
  );
  assert.equal(res.statusCode, 422);
  assert.deepEqual(Object.keys(res.body.errors).sort(), ['consent', 'email', 'name']);
});

await test('honeypot submission looks successful but is not stored', async () => {
  setEnv(KV);
  stubFetch();
  const res = mockRes();
  await (await loadHandler())(mockReq({ ...valid, company: 'bot corp' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(calls.length, 0, 'nothing should be written');
});

await test('instant submission is treated as a bot', async () => {
  setEnv(KV);
  stubFetch();
  const res = mockRes();
  await (await loadHandler())(mockReq({ ...valid, t: Date.now() }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 0);
});

await test('over the rate limit returns 429', async () => {
  setEnv(KV);
  stubFetch();
  globalThis.fetch = async (url, opts) => {
    const cmd = JSON.parse(opts.body)[0];
    calls.push({ url: String(url), body: opts.body });
    return { ok: true, status: 200, json: async () => ({ result: cmd === 'INCR' ? 99 : 1 }) };
  };
  const res = mockRes();
  await (await loadHandler())(mockReq(valid), res);
  assert.equal(res.statusCode, 429);
});

await test('x-forwarded-for is preferred over socket address', async () => {
  setEnv(KV);
  stubFetch();
  const res = mockRes();
  await (await loadHandler())(
    mockReq(valid, { headers: { 'x-forwarded-for': '198.51.100.7, 10.0.0.1' } }),
    res,
  );
  const push = calls.find((c) => c.body?.includes('LPUSH'));
  assert.equal(JSON.parse(JSON.parse(push.body)[2]).ip, '198.51.100.7');
});

await test('all three sinks fire when all are configured', async () => {
  setEnv({ ...KV, ...KLAVIYO, ...HOOK });
  stubFetch();
  const res = mockRes();
  await (await loadHandler())(mockReq(valid), res);
  assert.equal(res.statusCode, 200);
  assert.ok(calls.some((c) => c.url.includes('klaviyo')), 'klaviyo not called');
  assert.ok(calls.some((c) => c.url.includes('hooks.example')), 'webhook not called');
  assert.ok(calls.some((c) => c.body?.includes('LPUSH')), 'kv not called');
});

await test('klaviyo payload carries email, consent, and the list id', async () => {
  setEnv(KLAVIYO);
  stubFetch();
  await (await loadHandler())(mockReq(valid), mockRes());
  const k = calls.find((c) => c.url.includes('klaviyo'));
  const p = JSON.parse(k.body);
  const profile = p.data.attributes.profiles.data[0].attributes;
  assert.equal(profile.email, 'david@example.com');
  assert.equal(profile.subscriptions.email.marketing.consent, 'SUBSCRIBED');
  assert.equal(p.data.relationships.list.data.id, 'ABC123');
});

await test('one failing sink still succeeds if another works', async () => {
  setEnv({ ...KV, ...KLAVIYO });
  stubFetch({ fail: ['klaviyo'] });
  const res = mockRes();
  await (await loadHandler())(mockReq(valid), res);
  assert.equal(res.statusCode, 200, 'KV succeeded, so the request should succeed');
});

await test('502 only when every sink fails', async () => {
  setEnv({ ...KLAVIYO, ...HOOK });
  stubFetch({ fail: ['klaviyo', 'webhook'] });
  const res = mockRes();
  await (await loadHandler())(mockReq(valid), res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.ok, false);
});

await test('string body is parsed, and unparseable body fails validation', async () => {
  setEnv(KV);
  stubFetch();
  const res = mockRes();
  await (await loadHandler())(mockReq(JSON.stringify(valid)), res);
  assert.equal(res.statusCode, 200);

  const res2 = mockRes();
  await (await loadHandler())(mockReq('}{not json'), res2);
  assert.equal(res2.statusCode, 422);
});

await test('oversized input is truncated, not rejected outright', async () => {
  setEnv(KV);
  stubFetch();
  await (await loadHandler())(mockReq({ ...valid, name: 'A'.repeat(500) }), mockRes());
  const push = calls.find((c) => c.body?.includes('LPUSH'));
  assert.equal(JSON.parse(JSON.parse(push.body)[2]).name.length, 100);
});

console.log(`\n${passed} passed`);
