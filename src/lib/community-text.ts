/**
 * Turning stored community data into something on a page.
 *
 * Dependency-free, like `membership.ts` and for the same reason: `bylineOf` is
 * the function standing between a member's email address and a room full of
 * their competitors, and a rule like that should be checkable without standing
 * up a database first.
 */

/** Everything about an author a member is allowed to see. */
export type Byline = {
  displayName?: string | null
  name?: string | null
  email?: string | null
}

/** What somebody is called when they have chosen nothing at all. */
export const FALLBACK_BYLINE = 'Member'

/**
 * A byline, from whatever the person has actually filled in.
 *
 * Falls through `displayName` to `name` to the local part of the email — and
 * stops there. **The address itself is never a fallback.** An email is not a
 * name, and publishing one because somebody never opened the profile form would
 * be our mistake rather than theirs.
 *
 * The local part is a deliberate compromise: it is usually a first name, it is
 * what the person themselves chose, and it is not an address anybody can post
 * to. Where even that is missing, everyone is a Member.
 */
export const bylineOf = (user: Byline | null | undefined): string => {
  const chosen = user?.displayName?.trim() || user?.name?.trim()
  if (chosen) return chosen
  const local = user?.email?.split('@')[0]?.trim()
  return local || FALLBACK_BYLINE
}

/** A one-glance summary of a post, for the feed. */
export const excerptOf = (body: string, max = 180): string => {
  const flat = (body || '').replace(/\s+/g, ' ').trim()
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`
}

/**
 * Plain text into paragraphs, splitting on blank lines.
 *
 * The convention the rest of the site already uses for multi-line copy, and the
 * reason a textarea is enough: people write paragraphs by pressing return
 * twice. Nothing here is interpreted as markup, which is what makes a
 * member-written body safe to render with no sanitiser in the path.
 */
export const paragraphsOf = (body: string): string[] =>
  (body || '')
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)

/**
 * A date a reader can scan, fixed to UTC.
 *
 * Same reasoning as the blog: the server and the browser must format it
 * identically or React logs a hydration mismatch — and two people reading the
 * same thread would see two different days on the same reply.
 */
export const formatWhen = (value: string | null): string => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date)
}
