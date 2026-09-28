/**
 * What a member is allowed to post, decided without a database.
 *
 * Dependency-free so it can be unit-tested directly, like `join-live.ts` — the
 * rules about what makes a valid question are worth checking without standing
 * up Postgres first.
 *
 * Length caps exist for two different reasons and it is worth keeping them
 * straight. The title is capped at something a person can read in a list. The
 * body is capped at something a person can read at all; it is not a security
 * control, because the collection stores plain text and renders it as
 * paragraphs, so a very long post is rude rather than dangerous.
 */

export const MAX_TITLE = 140
export const MIN_TITLE = 5
export const MAX_BODY = 8000
export const MIN_BODY = 2

/** Collapses the whitespace a paste brings with it, without eating paragraphs. */
export const tidy = (value: unknown): string =>
  typeof value === 'string'
    ? value
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : ''

export type Valid<T> = { ok: true; value: T }
export type Invalid = { ok: false; error: string }

export const validateThread = (input: {
  title?: unknown
  body?: unknown
}): Valid<{ title: string; body: string }> | Invalid => {
  // A title is one line by definition; a pasted newline would otherwise put a
  // line break inside a link in the feed.
  const title = tidy(input.title).replace(/\s*\n+\s*/g, ' ')
  const body = tidy(input.body)

  if (title.length < MIN_TITLE) return { ok: false, error: 'Give your question a title.' }
  if (title.length > MAX_TITLE) {
    return { ok: false, error: `Titles are ${MAX_TITLE} characters or fewer.` }
  }
  if (body.length < MIN_BODY) return { ok: false, error: 'Add a little detail to your question.' }
  if (body.length > MAX_BODY) {
    return { ok: false, error: `Posts are ${MAX_BODY} characters or fewer.` }
  }
  return { ok: true, value: { title, body } }
}

export const validateReply = (input: { body?: unknown }): Valid<{ body: string }> | Invalid => {
  const body = tidy(input.body)
  if (body.length < MIN_BODY) return { ok: false, error: 'Write a reply first.' }
  if (body.length > MAX_BODY) {
    return { ok: false, error: `Replies are ${MAX_BODY} characters or fewer.` }
  }
  return { ok: true, value: { body } }
}

export const MAX_DISPLAY_NAME = 60

/**
 * A display name, or a reason it will not do.
 *
 * Empty is allowed and means "go back to the fallback" — someone who regrets
 * putting their full name in a room of competitors should be able to take it
 * out, and refusing an empty box would leave them editing it to a space.
 */
export const validateDisplayName = (
  input: unknown,
): Valid<{ displayName: string | null }> | Invalid => {
  const name = tidy(input).replace(/\s+/g, ' ')
  if (!name) return { ok: true, value: { displayName: null } }
  if (name.length > MAX_DISPLAY_NAME) {
    return { ok: false, error: `Names are ${MAX_DISPLAY_NAME} characters or fewer.` }
  }
  // No angle brackets: the name is rendered as text everywhere, but it also
  // reaches page titles and the admin, and a name that looks like markup is a
  // trap somebody eventually falls into.
  if (/[<>]/.test(name)) return { ok: false, error: 'Names cannot contain < or >.' }
  return { ok: true, value: { displayName: name } }
}

/** The moderation actions, as a closed list the route can check against. */
export const MODERATION = ['pin', 'unpin', 'lock', 'unlock', 'delete'] as const
export type Moderation = (typeof MODERATION)[number]

export const isModeration = (value: unknown): value is Moderation =>
  typeof value === 'string' && (MODERATION as readonly string[]).includes(value)
