/**
 * Where somebody may be sent after signing in.
 *
 * Its own file with no imports, like `join-live.ts`, so the rule can be tested
 * without a database — it is the only thing standing between a sign-in link and
 * an open redirect.
 *
 * The check used to be "starts with `/` and not `//`". That is not enough, and
 * the gap is not exotic: browsers treat a backslash as a slash in a URL's path
 * position, so `/\evil.example/phish` passes that check and then resolves to
 * `https://evil.example/phish`. Anybody can request a sign-in link for anybody
 * else's address, so the attack needs nothing but a real email from us carrying
 * a `next` of their choosing — a genuine message from the real sender that signs
 * the member in and then drops them on a page made to look like the site.
 *
 * So this does not try to recognise every bad shape. It accepts one good one:
 * a same-site absolute path made of ordinary path characters, and refuses
 * everything else.
 */

/**
 * A single leading slash, then ordinary URL characters. No second slash or
 * backslash immediately after the first, and nothing outside the allowed set —
 * so no whitespace, no control characters and no stray backslashes anywhere.
 * (`@` is fine inside a path; it only means something in an authority, and an
 * authority cannot follow a single leading slash.)
 */
const SAFE_PATH = /^\/(?![/\\])[A-Za-z0-9\-._~!$&'()*+,;=:@%/?#[\]]*$/

export const safeNext = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  if (value.length === 0 || value.length > 512) return undefined
  if (!SAFE_PATH.test(value)) return undefined
  // Percent-encoded slashes and backslashes get decoded somewhere downstream
  // more often than anybody expects. Refuse the encoded forms at the start of
  // the path rather than discovering which layer decodes them.
  if (/^\/(%2f|%5c)/i.test(value)) return undefined
  return value
}

/** Where a sign-in lands when no safe destination was given. */
export const DEFAULT_LANDING = '/learn'
