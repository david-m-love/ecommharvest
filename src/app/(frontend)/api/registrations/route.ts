import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

import { isAdmin } from '@/lib/access'
import { getCurrentUser } from '@/lib/auth'
import { payload } from '@/lib/entitlements'

/**
 * GET /api/registrations — CSV export.
 *
 * Two ways in: a signed-in admin session (so the link works from the admin UI),
 * or a bearer token for scripting:
 *
 *   curl -H "Authorization: Bearer $ADMIN_TOKEN" https://<site>/api/registrations
 */

const COLUMNS = [
  'createdAt',
  'name',
  'email',
  'storeUrl',
  'event',
  'consent',
  'referer',
  'ip',
  'userAgent',
] as const

const tokenMatches = (header: string | null) => {
  const expected = process.env.ADMIN_TOKEN
  if (!expected) return false
  const provided = header?.startsWith('Bearer ') ? header.slice(7) : ''
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  // timingSafeEqual throws on length mismatch, so compare lengths first.
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Prefix a leading = + - or @ so spreadsheets treat the value as text, not a formula. */
const csvCell = (value: unknown) => {
  let s = value === undefined || value === null ? '' : String(value)
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export async function GET(request: Request) {
  const user = await getCurrentUser()
  const authorised = (user && isAdmin(user)) || tokenMatches(request.headers.get('authorization'))
  if (!authorised) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } },
    )
  }

  const p = await payload()
  const rows = await p.find({
    collection: 'registrations',
    limit: 10000,
    depth: 0,
    sort: '-createdAt',
    overrideAccess: true,
  })

  const lines = [COLUMNS.join(',')]
  for (const row of rows.docs) {
    lines.push(COLUMNS.map((c) => csvCell((row as unknown as Record<string, unknown>)[c])).join(','))
  }

  return new NextResponse(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="q4-masterclass-registrations.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
