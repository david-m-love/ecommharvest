// POST /api/register — masterclass registration.
//
// Writes each registration to every sink that is configured, and refuses the
// request outright if none are, so a lead is never accepted into a void:
//
//   KV_REST_API_URL + KV_REST_API_TOKEN   Vercel KV / Upstash Redis (durable list)
//   KLAVIYO_PRIVATE_KEY + KLAVIYO_LIST_ID Klaviyo list subscribe
//   REGISTRATION_WEBHOOK_URL              generic JSON POST (Zapier, Make, n8n)
//
// No dependencies: Vercel's Node runtime gives us global fetch.

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const KLAVIYO_KEY = process.env.KLAVIYO_PRIVATE_KEY;
const KLAVIYO_LIST = process.env.KLAVIYO_LIST_ID;
const WEBHOOK = process.env.REGISTRATION_WEBHOOK_URL;

const KLAVIYO_REVISION = '2024-10-15';
const LIST_KEY = 'registrations';
const EMAIL_SET_KEY = 'registration_emails';
const RATE_LIMIT = 8; // submissions per IP per hour
const MIN_FILL_MS = 2500; // faster than a human could read the form

const hasKv = () => Boolean(KV_URL && KV_TOKEN);
const hasKlaviyo = () => Boolean(KLAVIYO_KEY && KLAVIYO_LIST);
const sinkCount = () => [hasKv(), hasKlaviyo(), Boolean(WEBHOOK)].filter(Boolean).length;

// Upstash REST accepts a command as a JSON array body.
async function kv(command) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!r.ok) throw new Error(`kv ${command[0]} failed: ${r.status} ${await r.text()}`);
  return (await r.json()).result;
}

async function klaviyoSubscribe(reg) {
  const body = {
    data: {
      type: 'profile-subscription-bulk-create-job',
      attributes: {
        profiles: {
          data: [
            {
              type: 'profile',
              attributes: {
                email: reg.email,
                first_name: reg.name,
                properties: {
                  store_url: reg.storeUrl || '',
                  source: 'q4-masterclass-landing',
                  registered_for: 'Q4 Masterclass 2026-09-03',
                },
                subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } },
              },
            },
          ],
        },
      },
      relationships: { list: { data: { type: 'list', id: KLAVIYO_LIST } } },
    },
  };
  const r = await fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs', {
    method: 'POST',
    headers: {
      Authorization: `Klaviyo-API-Key ${KLAVIYO_KEY}`,
      revision: KLAVIYO_REVISION,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  // 202 Accepted is the success case for a bulk job.
  if (!r.ok && r.status !== 202) {
    throw new Error(`klaviyo failed: ${r.status} ${await r.text()}`);
  }
}

function clean(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

// Deliberately permissive: rejecting unusual-but-valid addresses costs real leads.
// Real validation is the confirmation email landing.
function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Fail loudly rather than accepting registrations nothing will ever read.
  if (sinkCount() === 0) {
    console.error('register: no sink configured (KV / Klaviyo / webhook all unset)');
    return res.status(503).json({
      ok: false,
      error: 'Registration is not configured yet. Please email us and we will save you a seat.',
    });
  }

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};

  const name = clean(body.name, 100);
  const email = clean(body.email, 254).toLowerCase();
  const storeUrl = clean(body.storeUrl, 200);
  const consent = body.consent === true || body.consent === 'true' || body.consent === 'on';
  const honeypot = clean(body.company, 100);
  const renderedAt = Number(body.t) || 0;

  // Bots fill hidden fields and submit instantly.
  if (honeypot) return res.status(200).json({ ok: true });
  if (renderedAt && Date.now() - renderedAt < MIN_FILL_MS) {
    return res.status(200).json({ ok: true });
  }

  const errors = {};
  if (name.length < 2) errors.name = 'Please enter your first name.';
  if (!validEmail(email)) errors.email = 'Please enter a valid email address.';
  if (!consent) errors.consent = 'Please agree to receive the invite and reminders.';
  if (Object.keys(errors).length) {
    return res.status(422).json({ ok: false, error: 'Please check the highlighted fields.', errors });
  }

  const ip = clientIp(req);

  if (hasKv()) {
    try {
      const key = `ratelimit:${ip}`;
      const hits = await kv(['INCR', key]);
      if (hits === 1) await kv(['EXPIRE', key, '3600']);
      if (hits > RATE_LIMIT) {
        return res.status(429).json({ ok: false, error: 'Too many attempts. Please try again later.' });
      }
    } catch (err) {
      console.error('register: rate limit check failed, allowing request', err);
    }
  }

  const registration = {
    name,
    email,
    storeUrl,
    consent,
    registeredAt: new Date().toISOString(),
    ip,
    userAgent: clean(req.headers['user-agent'], 300),
    referer: clean(req.headers.referer, 300),
  };

  // Every sink is attempted; one failing must not lose the others.
  const results = await Promise.allSettled([
    hasKv() ? storeInKv(registration) : null,
    hasKlaviyo() ? klaviyoSubscribe(registration) : null,
    WEBHOOK ? postWebhook(registration) : null,
  ]);

  const attempted = results.filter((r, i) => [hasKv(), hasKlaviyo(), Boolean(WEBHOOK)][i]);
  const failures = attempted.filter((r) => r.status === 'rejected');
  failures.forEach((f) => console.error('register: sink failed', f.reason));

  if (failures.length === attempted.length) {
    return res.status(502).json({
      ok: false,
      error: 'We could not save your registration. Please try again in a moment.',
    });
  }

  return res.status(200).json({ ok: true });
}

async function storeInKv(reg) {
  await kv(['LPUSH', LIST_KEY, JSON.stringify(reg)]);
  await kv(['SADD', EMAIL_SET_KEY, reg.email]);
}

async function postWebhook(reg) {
  const r = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reg),
  });
  if (!r.ok) throw new Error(`webhook failed: ${r.status}`);
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
