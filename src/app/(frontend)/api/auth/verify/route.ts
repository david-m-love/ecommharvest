import { NextResponse } from 'next/server'

import { payload } from '@/lib/entitlements'
import { consumeLoginToken, peekLoginToken } from '@/lib/magic-link'
import { DEFAULT_LANDING, safeNext } from '@/lib/safe-next'
import { createSessionCookie } from '@/lib/session'
import type { User } from '@/payload-types'

/**
 * Signing in from the emailed link, in two steps — and the two steps are the
 * fix, not a flourish.
 *
 *   GET  /api/auth/verify?token=…   shows a page with one button. Spends nothing.
 *   POST /api/auth/verify           the button. Spends the token, sets the
 *                                   session cookie, and redirects.
 *
 * **Why this used to loop back to the login form.** It was one GET that did
 * everything: spend the token, set the cookie, redirect to `/learn`. A member
 * clicking that link in Gmail is making a *cross-site* navigation, and every hop
 * of a redirect chain that began on another site stays cross-site. Payload only
 * trusts a session cookie on a page request with no `Origin` header when the
 * browser says the request is same-origin, same-site or direct — so `/learn`
 * received a perfectly valid cookie and discarded it, and sent the member back
 * to `/login` having done everything right. Verified against a real browser:
 * the identical cookie gets a 307 to `/login` when the request is cross-site and
 * a 200 when it is same-origin.
 *
 * The button breaks the chain. A click on a page *we* served is a same-origin
 * request, so the POST — and the redirect it ends in — is same-origin all the
 * way to `/learn`, and the cookie is honoured.
 *
 * **Why a GET that spends nothing is better anyway.** Mail systems fetch every
 * link in a message to scan it, with a plain GET and nobody there. Consuming the
 * token on GET meant a scanner could use it up before the member ever clicked,
 * and they would meet "expired" on their first try.
 *
 * The URL is unchanged, so emails already sent keep working.
 */

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' }

const esc = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const expired = (origin: string) =>
  NextResponse.redirect(new URL('/login?error=expired', origin), { headers: NO_STORE })

/** The page with the button. Plain HTML: it has to work with nothing else loaded. */
const confirmPage = (token: string): string => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Sign in — eCommHarvest</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
      background:#FBF8F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#16324F}
    main{width:100%;max-width:420px;margin:24px;padding:36px 32px;background:#fff;border:1px solid #DCE5EC;
      border-radius:22px;text-align:center}
    img{height:34px;width:auto;margin:0 0 22px}
    h1{margin:0 0 10px;font-size:24px;letter-spacing:-.02em}
    p{margin:0 0 24px;color:#4E627A;line-height:1.55}
    button{width:100%;cursor:pointer;border:0;border-radius:999px;background:#C99132;color:#fff;
      font-family:inherit;font-size:16px;font-weight:700;line-height:1;padding:16px 24px}
    button:focus-visible{outline:2px solid #8B6423;outline-offset:3px}
  </style>
</head>
<body>
  <main>
    <img src="/logo.png" alt="eCommHarvest" width="197" height="34">
    <h1>Ready to sign in</h1>
    <p>One click and you’re in.</p>
    <form method="post" action="/api/auth/verify">
      <input type="hidden" name="token" value="${esc(token)}">
      <button type="submit">Sign in to eCommHarvest</button>
    </form>
  </main>
</body>
</html>`

/** GET — look, don't touch. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') || ''

  // An expired or used link is worth saying so *now*, rather than after a click.
  if (!(await peekLoginToken(token))) return expired(url.origin)

  return new Response(confirmPage(token), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE },
  })
}

/** POST — the click. Spends the token and signs the member in. */
export async function POST(request: Request) {
  const url = new URL(request.url)

  /**
   * Same-origin only. This is a state-changing request that needs no cookie — the
   * token *is* the credential — which makes it the shape login CSRF takes: an
   * attacker requests a link for **their own** account and tricks a victim's
   * browser into submitting it, signing the victim in as the attacker. Browsers
   * attach `Origin` to every POST, and the only legitimate one comes from the
   * page above, on this origin.
   */
  const origin = request.headers.get('origin')
  if (origin && origin !== url.origin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE })
  }

  const form = await request.formData().catch(() => null)
  const token = typeof form?.get('token') === 'string' ? (form!.get('token') as string) : ''

  const consumed = await consumeLoginToken(token)
  if (!consumed) return expired(url.origin)

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
    return NextResponse.redirect(new URL('/login?error=unknown', url.origin), {
      headers: NO_STORE,
    })
  }

  /**
   * Checked again here, not only when the link was requested. The value was
   * stored fifteen minutes ago by a different request; trusting it because it
   * "was validated at the time" is how a later change to one check leaves the
   * other behind.
   *
   * 303, not 307: the destination must be fetched with GET, and 307 would
   * replay the POST at `/community`.
   */
  const destination = safeNext(consumed.next) ?? DEFAULT_LANDING
  const response = NextResponse.redirect(new URL(destination, url.origin), {
    status: 303,
    headers: NO_STORE,
  })
  response.headers.set('Set-Cookie', await createSessionCookie(user))
  return response
}
