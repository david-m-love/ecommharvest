import { randomBytes } from 'node:crypto'

import { payload } from '@/lib/entitlements'
import { TOKEN_TTL_MS } from '@/lib/login-email'
import { withinLimit } from '@/lib/rate-limit'

/**
 * Passwordless sign-in tokens.
 *
 * The token is an opaque random value whose meaning lives only in our KV store,
 * rather than a self-contained signed blob. That buys two things a signed JWT
 * would not: it is single-use (consuming it deletes the record, so a forwarded
 * email cannot be replayed), and it carries no readable payload if it leaks
 * into a log or a referrer header.
 *
 * `TOKEN_TTL_MS` lives in `login-email.ts` rather than here, because the email
 * has to state the expiry out loud and two numbers that must agree should be one
 * number. The email is the thing a person reads; this is the thing that enforces
 * it.
 */

const KEY_PREFIX = 'magic:'
/** Reverse index: which token was last emailed to this address, and when. */
const RECENT_PREFIX = 'magic-recent:'
const MAX_REQUESTS_PER_HOUR = 5

/**
 * How long a second request re-sends the first link instead of minting another.
 *
 * Double-submitting a form is the normal case, not the exotic one — the button
 * gives no feedback while the request is in flight, so people press it again.
 * Without this they receive two emails holding two different valid links, which
 * burns two of their five hourly requests and leaves them guessing which one is
 * current. Ninety seconds covers a double click and an impatient retry without
 * being long enough to matter if somebody genuinely wants a fresh link.
 */
const REUSE_WINDOW_MS = 90 * 1000

type TokenRecord = { email: string; expiresAt: number; next?: string }
type RecentRecord = { token: string; issuedAt: number }

const mint = async (email: string, next?: string): Promise<string> => {
  const p = await payload()
  const token = randomBytes(32).toString('base64url')
  const record: TokenRecord = {
    email: email.toLowerCase(),
    expiresAt: Date.now() + TOKEN_TTL_MS,
    next,
  }
  await p.kv.set(`${KEY_PREFIX}${token}`, record)
  await p.kv.set(`${RECENT_PREFIX}${email.toLowerCase()}`, {
    token,
    issuedAt: Date.now(),
  } satisfies RecentRecord)
  return token
}

/**
 * A token to email, reusing the one just sent if the request is a repeat.
 *
 * Returns `{ token, reused }` so the caller can tell the two apart in its logs
 * — "we sent one" and "we sent the same one again" look identical in an inbox
 * and should not look identical in a log.
 */
export const createLoginToken = async (
  email: string,
  next?: string,
): Promise<{ token: string; reused: boolean }> => {
  const p = await payload()
  const key = `${RECENT_PREFIX}${email.toLowerCase()}`

  try {
    const recent = await p.kv.get<RecentRecord>(key)
    if (recent?.token && Date.now() - recent.issuedAt < REUSE_WINDOW_MS) {
      /**
       * The existence check is the part that matters.
       *
       * `consumeLoginToken` deletes the record the moment somebody signs in, so
       * a recent *issue* is not proof of a usable token. Skipping this would
       * email a dead link to anyone who signed in and immediately asked for
       * another — which is exactly what somebody does when they land on the
       * wrong device.
       */
      const live = await p.kv.get<TokenRecord>(`${KEY_PREFIX}${recent.token}`)
      if (live && live.expiresAt > Date.now()) return { token: recent.token, reused: true }
    }
  } catch (err) {
    // A broken reverse index must never stop somebody signing in. Mint a fresh
    // one and carry on; the cost is one extra email, not a locked door.
    console.error('magic-link: could not read the recent-token index', err)
  }

  return { token: await mint(email, next), reused: false }
}

/**
 * Whether a token is still good, **without spending it**.
 *
 * This is what the confirm page uses to decide between "here is your button" and
 * "that link has expired" — and the reason it exists at all is that opening a
 * link is not the same as meaning it. Mail systems fetch every link in a message
 * to scan it, with a plain GET and no person involved; if looking at the link
 * used it up, the member's first real click would meet "expired" and they would
 * conclude the product was broken.
 *
 * It reveals nothing a scanner could use: it answers the same question the
 * eventual click would, about a token the caller already holds.
 */
export const peekLoginToken = async (token: string): Promise<boolean> => {
  if (!token || token.length < 20) return false
  const p = await payload()
  const record = await p.kv.get<TokenRecord>(`${KEY_PREFIX}${token}`)
  return Boolean(record && typeof record.expiresAt === 'number' && record.expiresAt > Date.now())
}

/**
 * Validates and burns a token. Returns null for unknown, expired, or
 * already-used tokens — deliberately indistinguishable to the caller so the
 * error message cannot be used to probe which tokens once existed.
 */
export const consumeLoginToken = async (
  token: string,
): Promise<{ email: string; next?: string } | null> => {
  if (!token || token.length < 20) return null
  const p = await payload()
  const key = `${KEY_PREFIX}${token}`

  const record = await p.kv.get<TokenRecord>(key)
  if (!record) return null

  // Burn it first: a slow downstream step must not leave a reusable token.
  await p.kv.delete(key)

  if (typeof record.expiresAt !== 'number' || record.expiresAt < Date.now()) return null
  return { email: record.email, next: record.next }
}

/**
 * Per-email hourly cap, so the endpoint cannot be used to mail-bomb someone.
 * Keyed on email rather than IP because the abuse we care about is inbox spam.
 *
 * The counting now lives in `lib/rate-limit.ts`, shared with the community, so
 * there is one limiter in the app rather than one per feature. `failOpen` is
 * false here for the reason spelled out there: a broken limiter must stop the
 * send rather than wave it through.
 */
export const withinRateLimit = async (email: string): Promise<boolean> =>
  withinLimit({
    bucket: 'magic-link',
    subject: email,
    max: MAX_REQUESTS_PER_HOUR,
    windowMs: 60 * 60 * 1000,
    failOpen: false,
  })

/**
 * Best-effort sweep of expired tokens. The KV adapter has no TTL, so without
 * this the table grows forever. Called opportunistically on token creation
 * rather than on a schedule, which is enough at this volume.
 */
export const pruneExpiredTokens = async (): Promise<number> => {
  const p = await payload()
  const keys = await p.kv.keys()
  const now = Date.now()
  let removed = 0

  for (const key of keys.filter((k) => k.startsWith(KEY_PREFIX))) {
    const record = await p.kv.get<TokenRecord>(key)
    if (!record || typeof record.expiresAt !== 'number' || record.expiresAt < now) {
      await p.kv.delete(key)
      removed++
    }
  }

  /**
   * The reverse index needs sweeping too, or it becomes a permanent record of
   * every address that ever asked for a link — which is a list of members we
   * have no reason to keep. It is useless past the reuse window, so that is
   * when it goes.
   *
   * `magic-recent:` does not start with `magic:`, so the loop above leaves these
   * alone and they would otherwise accumulate forever.
   */
  for (const key of keys.filter((k) => k.startsWith(RECENT_PREFIX))) {
    const record = await p.kv.get<RecentRecord>(key)
    if (!record || typeof record.issuedAt !== 'number' || now - record.issuedAt > REUSE_WINDOW_MS) {
      await p.kv.delete(key)
      removed++
    }
  }

  return removed
}
