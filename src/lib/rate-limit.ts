import { payload } from '@/lib/entitlements'

/**
 * One fixed-window rate limiter, shared.
 *
 * There were two before this file: a KV counter in `magic-link.ts` keyed on
 * email, and an Upstash one in `registration.ts` keyed on IP. Neither knew
 * about the other, so "is this person doing this too fast" had no single answer
 * and adding a third caller meant picking a side. This is the KV one, lifted
 * out and given a bucket name, because it needs nothing but the database the
 * app already has.
 *
 * Fixed window rather than sliding on purpose: one read, one write, no drift,
 * and the failure mode — a burst straddling a window boundary gets through — is
 * uninteresting when the limit exists to stop somebody pasting the same
 * question forty times.
 */

export type RateLimit = {
  /** What is being limited, e.g. `community-post`. Namespaces the key. */
  bucket: string
  /** What is counted against — an email, a user id, an IP. */
  subject: string | number
  max: number
  windowMs: number
  /**
   * What to do when the store itself is unreachable.
   *
   * Posting a question is `true`: a KV hiccup taking down the whole room is a
   * worse outage than the flooding the limit prevents. Sending sign-in emails
   * is `false`: there the limit is what stops the endpoint being used to
   * mail-bomb somebody, so a broken limiter must stop the send, not wave it
   * through. Defaults to closed, because that is the safer thing to forget.
   */
  failOpen?: boolean
}

type Window = { count: number; windowStart: number }

/** True when this action is allowed, and counts it. */
export const withinLimit = async ({
  bucket,
  subject,
  max,
  windowMs,
  failOpen = false,
}: RateLimit): Promise<boolean> => {
  const key = `rate:${bucket}:${String(subject).toLowerCase()}`
  const now = Date.now()

  try {
    const p = await payload()
    const existing = await p.kv.get<Window>(key)

    if (
      !existing ||
      typeof existing.windowStart !== 'number' ||
      now - existing.windowStart > windowMs
    ) {
      await p.kv.set(key, { count: 1, windowStart: now })
      return true
    }
    if (existing.count >= max) return false

    await p.kv.set(key, { count: existing.count + 1, windowStart: existing.windowStart })
    return true
  } catch (err) {
    console.error(`rate-limit: ${bucket} check failed`, err)
    return failOpen
  }
}
