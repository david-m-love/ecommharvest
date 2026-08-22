/**
 * Turns what someone typed into a link into a link that goes where they meant.
 *
 * The bug this fixes is HTML's, not anyone's mistake. An `href` with no scheme
 * and no leading slash is a *relative* path, so typing
 *
 *     go.ecommharvest.com/register
 *
 * produces `app.ecommharvest.com/go.ecommharvest.com/register` — the browser
 * glues it onto the page you were already on. There is no error and nothing
 * looks wrong until the button is clicked, and the funnel it was pointing at is
 * on another domain.
 *
 * Typing the address without `https://` is the normal way people write one down,
 * so it is treated as one:
 *
 *     go.ecommharvest.com/register   →  https://go.ecommharvest.com/register
 *     www.example.com                →  https://www.example.com
 *     example.com:3000/x             →  https://example.com:3000/x
 *     /register                      →  /register            (this site)
 *     register                       →  /register            (a page, not a host)
 *     #speakers                      →  #speakers
 *     mailto:hi@example.com          →  unchanged
 *     https://…                      →  unchanged
 *
 * Applied when a link is *rendered*, not when it is saved, so every link already
 * stored is fixed too — and so the field keeps showing what was typed rather
 * than quietly rewriting it under the cursor.
 *
 * https is assumed rather than http. Every host worth linking to serves it, and
 * a redirect to https costs one request; guessing http would downgrade a secure
 * link and could be stripped as mixed content.
 */

/** Schemes a link may legitimately start with. Anything else is not a scheme. */
const SCHEME = /^(https?|mailto|tel|sms|ftp):/i

/**
 * Looks like a hostname: at least one dot between label characters, an optional
 * port, then the end of the string or a path, query or fragment.
 *
 * The dot is what separates `go.ecommharvest.com/register` from `register`. It
 * makes `example.com` a host and `register` a path, which is right in both
 * cases, and it is the same test a person applies reading it.
 */
const LOOKS_LIKE_HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:\d+)?([/?#]|$)/i

export const toHref = (raw: string | undefined | null): string | undefined => {
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  if (!value) return undefined

  // Already unambiguous: a scheme, a protocol-relative URL, a path, a query or
  // a fragment.
  if (SCHEME.test(value)) return value
  if (value.startsWith('//')) return value
  if (value.startsWith('/') || value.startsWith('#') || value.startsWith('?')) return value

  if (LOOKS_LIKE_HOST.test(value)) return `https://${value}`

  /**
   * No dot, no slash: a page on this site written without one, like `register`.
   * Left relative it would resolve against whatever page it sits on — correct
   * only at the site root, and wrong on `/masterclass`.
   */
  return `/${value}`
}

/**
 * Whether a link leaves this site, judged after normalising it.
 *
 * Used to decide `target="_blank"`. Judged on the finished href, because
 * `go.ecommharvest.com/register` is external and only looks internal before it
 * has been read properly.
 */
export const isExternalHref = (raw: string | undefined | null): boolean => {
  const href = toHref(raw)
  if (!href) return false
  return /^(https?:)?\/\//i.test(href) || /^(mailto|tel|sms):/i.test(href)
}
