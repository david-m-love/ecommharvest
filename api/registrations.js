// GET /api/registrations — export registrations as CSV.
//
//   curl -H "Authorization: Bearer $ADMIN_TOKEN" https://<site>/api/registrations > regs.csv
//
// Requires ADMIN_TOKEN and Vercel KV. Returns 404 when KV is not configured, so
// the endpoint does not advertise itself on a site that isn't using it.

import { timingSafeEqual } from 'node:crypto';

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const COLUMNS = ['registeredAt', 'name', 'email', 'storeUrl', 'consent', 'referer', 'ip', 'userAgent'];

function authorized(req) {
  if (!ADMIN_TOKEN) return false;
  const header = req.headers.authorization || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(provided);
  const b = Buffer.from(ADMIN_TOKEN);
  // timingSafeEqual throws on length mismatch, so compare lengths first.
  return a.length === b.length && timingSafeEqual(a, b);
}

// Prefix a leading =, +, - or @ so spreadsheets treat the value as text, not a formula.
function csvCell(value) {
  let s = value === undefined || value === null ? '' : String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!KV_URL || !KV_TOKEN) {
    return res.status(404).json({ ok: false, error: 'Not found' });
  }
  if (!authorized(req)) {
    res.setHeader('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  let rows;
  try {
    const r = await fetch(KV_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['LRANGE', 'registrations', '0', '-1']),
    });
    if (!r.ok) throw new Error(`kv LRANGE failed: ${r.status}`);
    rows = (await r.json()).result || [];
  } catch (err) {
    console.error('registrations: read failed', err);
    return res.status(502).json({ ok: false, error: 'Could not read registrations' });
  }

  const lines = [COLUMNS.join(',')];
  for (const raw of rows) {
    let reg;
    try {
      reg = JSON.parse(raw);
    } catch {
      continue;
    }
    lines.push(COLUMNS.map((c) => csvCell(reg[c])).join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="q4-masterclass-registrations.csv"');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(lines.join('\n'));
}
