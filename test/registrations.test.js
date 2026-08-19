// Exercises api/registrations.js — the auth boundary and CSV shaping.
//   node test/registrations.test.js

import assert from 'node:assert/strict';

function mockRes() {
  return {
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
}

const mockReq = (auth, method = 'GET') => ({
  method,
  headers: auth ? { authorization: auth } : {},
});

function stubKv(rows) {
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ result: rows }) });
}

function setEnv(env) {
  for (const k of ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'ADMIN_TOKEN']) delete process.env[k];
  Object.assign(process.env, env);
}

const load = async () => (await import(`../api/registrations.js?v=${Math.random()}`)).default;

const FULL = {
  KV_REST_API_URL: 'https://kv.example/',
  KV_REST_API_TOKEN: 'tok',
  ADMIN_TOKEN: 'secret-admin-token',
};

let passed = 0;
async function test(label, fn) {
  try {
    await fn();
    console.log(`  ok  ${label}`);
    passed++;
  } catch (err) {
    console.error(`FAIL  ${label}\n      ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('api/registrations.js');

await test('404 when KV is not configured, so the endpoint stays invisible', async () => {
  setEnv({ ADMIN_TOKEN: 'secret-admin-token' });
  stubKv([]);
  const res = mockRes();
  await (await load())(mockReq('Bearer secret-admin-token'), res);
  assert.equal(res.statusCode, 404);
});

await test('401 with no credentials', async () => {
  setEnv(FULL);
  stubKv([]);
  const res = mockRes();
  await (await load())(mockReq(null), res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.headers['www-authenticate'], 'Bearer');
});

await test('401 with a wrong token', async () => {
  setEnv(FULL);
  stubKv([]);
  const res = mockRes();
  await (await load())(mockReq('Bearer nope'), res);
  assert.equal(res.statusCode, 401);
});

await test('401 with a token that is a prefix of the real one', async () => {
  setEnv(FULL);
  stubKv([]);
  const res = mockRes();
  await (await load())(mockReq('Bearer secret'), res);
  assert.equal(res.statusCode, 401);
});

await test('401 when ADMIN_TOKEN is unset, never open by default', async () => {
  setEnv({ KV_REST_API_URL: 'https://kv.example/', KV_REST_API_TOKEN: 'tok' });
  stubKv([]);
  const res = mockRes();
  await (await load())(mockReq('Bearer anything'), res);
  assert.equal(res.statusCode, 401);
});

await test('405 on a non-GET method', async () => {
  setEnv(FULL);
  stubKv([]);
  const res = mockRes();
  await (await load())(mockReq('Bearer secret-admin-token', 'DELETE'), res);
  assert.equal(res.statusCode, 405);
});

await test('returns CSV with a header row and one row per registration', async () => {
  setEnv(FULL);
  stubKv([
    JSON.stringify({ registeredAt: '2026-08-19T01:00:00Z', name: 'David', email: 'a@b.com', consent: true }),
    JSON.stringify({ registeredAt: '2026-08-19T02:00:00Z', name: 'Derek', email: 'c@d.com', consent: true }),
  ]);
  const res = mockRes();
  await (await load())(mockReq('Bearer secret-admin-token'), res);
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/csv/);
  const lines = res.body.split('\n');
  assert.equal(lines.length, 3);
  assert.equal(lines[0], 'registeredAt,name,email,storeUrl,consent,referer,ip,userAgent');
  assert.ok(lines[1].includes('"David"') && lines[1].includes('"a@b.com"'));
});

await test('quotes in a value are escaped rather than breaking the row', async () => {
  setEnv(FULL);
  stubKv([JSON.stringify({ name: 'Da"vid', email: 'a@b.com' })]);
  const res = mockRes();
  await (await load())(mockReq('Bearer secret-admin-token'), res);
  assert.ok(res.body.includes('"Da""vid"'), res.body);
});

await test('a formula-looking value is neutralised for spreadsheets', async () => {
  setEnv(FULL);
  stubKv([JSON.stringify({ name: '=1+1', email: 'a@b.com' })]);
  const res = mockRes();
  await (await load())(mockReq('Bearer secret-admin-token'), res);
  assert.ok(res.body.includes(`"'=1+1"`), res.body);
});

await test('an unparseable stored row is skipped, not fatal', async () => {
  setEnv(FULL);
  stubKv(['not json at all', JSON.stringify({ name: 'David', email: 'a@b.com' })]);
  const res = mockRes();
  await (await load())(mockReq('Bearer secret-admin-token'), res);
  assert.equal(res.body.split('\n').length, 2);
});

await test('502 when KV cannot be read', async () => {
  setEnv(FULL);
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  const res = mockRes();
  await (await load())(mockReq('Bearer secret-admin-token'), res);
  assert.equal(res.statusCode, 502);
});

console.log(`\n${passed} passed`);
