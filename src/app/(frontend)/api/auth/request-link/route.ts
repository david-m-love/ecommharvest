import { NextResponse } from 'next/server'

import { payload } from '@/lib/entitlements'
import { createLoginToken, pruneExpiredTokens, withinRateLimit } from '@/lib/magic-link'

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
  const next = body.next && body.next.startsWith('/') && !body.next.startsWith('//')
    ? body.next
    : undefined

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

  const token = await createLoginToken(email, next)
  const base = process.env.NEXT_PUBLIC_SERVER_URL || new URL(request.url).origin
  const link = `${base}/api/auth/verify?token=${encodeURIComponent(token)}`

  // Payload's fallback adapter logs only the subject, so without this the link
  // is unreachable in local development.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n  Sign-in link for ${email}:\n  ${link}\n`)
  }

  try {
    await p.sendEmail({
      to: email,
      subject: 'Your eCommHarvest sign-in link',
      html: `
        <p>Here is your sign-in link. It works once and expires in 15 minutes.</p>
        <p><a href="${link}">Sign in to eCommHarvest</a></p>
        <p style="color:#4E627A;font-size:13px">If you did not ask for this, you can ignore it.</p>
      `,
    })
  } catch (err) {
    // With no email adapter configured Payload writes to the console, which is
    // how this works in local development. A real failure must not 500 the
    // request and reveal that the address exists.
    console.error('request-link: sendEmail failed', err)
  }

  // Opportunistic cleanup; the KV adapter has no TTL of its own.
  void pruneExpiredTokens().catch(() => {})

  return genericOk
}
