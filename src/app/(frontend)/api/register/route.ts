import { NextResponse } from 'next/server'

import { processRegistration } from '@/lib/registration'

/** POST /api/register — thin adapter; the logic and its tests live in lib/registration.ts. */
export async function POST(request: Request) {
  const raw = await request.json().catch(() => ({}))
  const input = typeof raw === 'object' && raw !== null ? raw : {}

  const forwarded = request.headers.get('x-forwarded-for')
  const result = await processRegistration(input, {
    ip: forwarded ? forwarded.split(',')[0].trim() : 'unknown',
    userAgent: request.headers.get('user-agent') || undefined,
    referer: request.headers.get('referer') || undefined,
  })

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { 'Cache-Control': 'no-store' },
  })
}
