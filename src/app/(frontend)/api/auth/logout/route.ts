import { NextResponse } from 'next/server'

import { createLogoutCookie } from '@/lib/session'

/** POST /api/auth/logout — clears the session cookie. POST so a link prefetch cannot sign you out. */
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/', new URL(request.url).origin))
  response.headers.set('Set-Cookie', await createLogoutCookie())
  return response
}
