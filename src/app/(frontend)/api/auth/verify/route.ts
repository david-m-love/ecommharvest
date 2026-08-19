import { NextResponse } from 'next/server'

import { payload } from '@/lib/entitlements'
import { consumeLoginToken } from '@/lib/magic-link'
import { createSessionCookie } from '@/lib/session'
import type { User } from '@/payload-types'

/**
 * GET /api/auth/verify?token=…
 *
 * Burns the one-time token, establishes a session, and redirects into the app.
 * A failed verification lands on /login with a reason rather than a raw error,
 * because the most common cause is simply an expired link.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') || ''

  const consumed = await consumeLoginToken(token)
  if (!consumed) {
    return NextResponse.redirect(new URL('/login?error=expired', url.origin))
  }

  const p = await payload()
  const found = await p.find({
    collection: 'users',
    where: { email: { equals: consumed.email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const user = found.docs[0] as User | undefined
  if (!user) {
    return NextResponse.redirect(new URL('/login?error=unknown', url.origin))
  }

  const destination = consumed.next || '/learn'
  const response = NextResponse.redirect(new URL(destination, url.origin))
  response.headers.set('Set-Cookie', await createSessionCookie(user))
  return response
}
