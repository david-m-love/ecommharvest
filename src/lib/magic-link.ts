import { randomBytes } from 'node:crypto'

import { payload } from '@/lib/entitlements'

/**
 * Passwordless sign-in tokens.
 *
 * The token is an opaque random value whose meaning lives only in our KV store,
 * rather than a self-contained signed blob. That buys two things a signed JWT
 * would not: it is single-use (consuming it deletes the record, so a forwarded
 * email cannot be replayed), and it carries no readable payload if it leaks
 * into a log or a referrer header.
 */

const TOKEN_TTL_MS = 15 * 60 * 1000
const KEY_PREFIX = 'magic:'
const RATE_PREFIX = 'magic-rate:'
const MAX_REQUESTS_PER_HOUR = 5

type TokenRecord = { email: string; expiresAt: number; next?: string }

export const createLoginToken = async (email: string, next?: string): Promise<string> => {
  const p = await payload()
  const token = randomBytes(32).toString('base64url')
  const record: TokenRecord = {
    email: email.toLowerCase(),
    expiresAt: Date.now() + TOKEN_TTL_MS,
    next,
  }
  await p.kv.set(`${KEY_PREFIX}${token}`, record)
  return token
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
 */
export const withinRateLimit = async (email: string): Promise<boolean> => {
  const p = await payload()
  const key = `${RATE_PREFIX}${email.toLowerCase()}`
  const now = Date.now()
  const existing = await p.kv.get<{ count: number; windowStart: number }>(key)

  if (!existing || now - existing.windowStart > 60 * 60 * 1000) {
    await p.kv.set(key, { count: 1, windowStart: now })
    return true
  }
  if (existing.count >= MAX_REQUESTS_PER_HOUR) return false

  await p.kv.set(key, { count: existing.count + 1, windowStart: existing.windowStart })
  return true
}

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
  return removed
}
