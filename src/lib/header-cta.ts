/**
 * The header button, as data.
 *
 * Its own module, with no imports, because two very different places need it:
 * `site-styles.ts` on the server, which reads Site Styles through Payload, and
 * the Header block, which also runs in the browser inside the builder. Living
 * in site-styles.ts would pull Payload into the editor's bundle.
 */

/** A button in the header. Both halves or nothing — see `headerCta`. */
export type HeaderCta = { label: string; href: string }

/**
 * A button only if it has words and a destination. A half-filled one would be a
 * dead button or an empty pill, both worse than no button at all.
 */
export const headerCta = (label: unknown, href: unknown): HeaderCta | null =>
  typeof label === 'string' && label.trim() && typeof href === 'string' && href.trim()
    ? { label: label.trim(), href: href.trim() }
    : null
