import { NextResponse } from 'next/server'

import { payload } from '@/lib/entitlements'
import { loginEmail } from '@/lib/login-email'
import { createLoginToken, pruneExpiredTokens, withinRateLimit } from '@/lib/magic-link'
import { safeNext } from '@/lib/safe-next'

/**
 * POST /api/auth/request-link  { email, next? }
 *
 * Emails a one-time sign-in link. Always answers 200 with the same body,
 * whether or not the address has an account — the response must not reveal who
 * is a member.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// A member who registered for the masterclass already exists. Anyone else who
// asks for a link gets an account created, so the flow is sign-in and sign-up
// at once — there is no separate registration step to abandon.
const AUTO_CREATE = true

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; next?: string }
  const email = (body.email || '').trim().toLowerCase().slice(0, 254)

  // Only accept in-app paths, so `next` cannot be turned into an open redirect.
  // See `lib/safe-next.ts` for why "starts with /" was not enough.
  const next = safeNext(body.next)

  const genericOk = NextResponse.json(
    { ok: true, message: 'If that address has an account, a sign-in link is on its way.' },
    { headers: { 'Cache-Control': 'no-store' } },
  )

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 422 })
  }

  if (!(await withinRateLimit(email))) {
    // Rate limiting is the one case worth telling the truth about, because the
    // user needs to know why no email arrived.
    return NextResponse.json(
      { ok: false, error: 'Too many sign-in emails. Please try again in an hour.' },
      { status: 429 },
    )
  }

  const p = await payload()

  const existing = await p.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  let user = existing.docs[0]
  if (!user) {
    if (!AUTO_CREATE) return genericOk
    user = await p.create({
      collection: 'users',
      data: {
        email,
        // Passwordless accounts still need a password column populated; this
        // value is never used to sign in and is not recoverable.
        password: crypto.randomUUID() + crypto.randomUUID(),
        roles: ['member'],
      },
      overrideAccess: true,
    })
  }

  const { token, reused } = await createLoginToken(email, next)
  /**
   * `NEXT_PUBLIC_SERVER_URL` wins over the request origin, which is worth
   * knowing when testing a preview deployment: if it is set, the emailed link
   * points wherever it says, not at the preview you requested it from. The
   * email arrives, the link works, and the test proves nothing about the build
   * you meant to check.
   */
  const base = process.env.NEXT_PUBLIC_SERVER_URL || new URL(request.url).origin
  const link = `${base}/api/auth/verify?token=${encodeURIComponent(token)}`

  // Payload's fallback adapter logs only the subject, so without this the link
  // is unreachable in local development.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n  Sign-in link for ${email}${reused ? ' (reused)' : ''}:\n  ${link}\n`)
  }

  const { subject, html, text } = loginEmail(link)

  try {
    await p.sendEmail({ to: email, subject, html, text })
  } catch (err) {
    /**
     * The visitor is told nothing — the response below is identical whether this
     * worked, failed, or had no adapter at all, because a different answer here
     * would turn the endpoint into a way to test whether an address has an
     * account.
     *
     * But the *log* has to say what happened. Every interesting failure looks
     * the same from the outside — no API key, an unverified sending domain, a
     * provider outage — and the from-address is the usual culprit, so it is
     * named here rather than left to be inferred. Without this, diagnosing a
     * silent non-delivery means guessing.
     */
    console.error(
      `request-link: send failed for ${email} ` +
        `from=${process.env.EMAIL_FROM_ADDRESS || 'noreply@notify.ecommharvest.com (default)'} ` +
        `adapter=${process.env.RESEND_API_KEY ? 'resend' : 'NONE — RESEND_API_KEY is not set'}: ` +
        `${err instanceof Error ? err.message : String(err)}`,
    )
  }

  // Opportunistic cleanup; the KV adapter has no TTL of its own.
  void pruneExpiredTokens().catch(() => {})

  return genericOk
}
