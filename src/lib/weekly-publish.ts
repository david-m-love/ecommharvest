/**
 * What must not reach the public when a sales page goes live.
 *
 * Its own file with no imports, like `join-live.ts`, so the rule can be checked
 * without a database and the migration that applies it is thin glue.
 *
 * **The failure this exists for.** A draft is allowed to say "Definition to be
 * confirmed before publishing" in a field that — once the page is public — is
 * printed under a headline figure. Publishing is the moment that note stops being
 * a reminder to us and becomes a sentence to a stranger, and the figure it was
 * guarding is, by the note's own admission, unconfirmed. Standing rule here: no
 * unverified number is published.
 *
 * So a block whose own note says it is unconfirmed is **held back** — switched
 * off, not deleted. It stays in the builder with all its words, shows as hidden
 * there, and comes back with one click once somebody has confirmed the claim.
 *
 * Only blocks still carrying that note are touched. If somebody has since edited
 * the note, they have looked at it and the decision is theirs; and a block already
 * switched off is already held.
 */

type Block = { type?: string; props?: Record<string, unknown> }
type PageContent = { content?: Block[] }

/** The phrases a draft uses to say "not yet true". Deliberately narrow. */
const UNCONFIRMED = /\b(to be confirmed|confirm(ed)? before publish(ing)?|tbc|tbd)\b/i

export const isUnconfirmed = (block: Block | null | undefined): boolean => {
  const note = block?.props?.note
  return typeof note === 'string' && UNCONFIRMED.test(note)
}

export type HoldResult = {
  content: PageContent
  /** Ids (or types, where there is no id) of the blocks that were switched off. */
  held: string[]
}

/** Returns a new page; the input is not touched. */
export const holdUnconfirmedClaims = (content: unknown): HoldResult => {
  const source = (content && typeof content === 'object' ? content : {}) as PageContent
  const blocks = Array.isArray(source.content) ? source.content : []
  const held: string[] = []

  const next = blocks.map((block) => {
    if (!isUnconfirmed(block)) return block
    if (block.props?.show === false) return block // already held
    held.push(String(block.props?.id ?? block.type ?? 'block'))
    return { ...block, props: { ...block.props, show: false } }
  })

  return { content: { ...source, content: next }, held }
}
