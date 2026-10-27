/**
 * Putting the payment link into the two Weekly pages.
 *
 * Its own file with no imports, like `join-live.ts`, so the rule can be checked
 * without a database — and so the migration that applies it is three lines of
 * glue around something that has been tested.
 *
 * The rule that matters: **fill what is empty, never overwrite what somebody
 * wrote.** The checkout URL is edited in the builder, by a person, and a deploy
 * that quietly replaced it with whatever this file says would undo a change
 * made an hour earlier — the worst possible way to find out two places disagree.
 */

type Block = { type?: string; props?: Record<string, unknown> }
type PageContent = { content?: Block[]; root?: unknown; zones?: unknown }

export type CheckoutResult = {
  /** The page, with the link in wherever it was missing. */
  content: PageContent
  /** Pricing blocks found. Zero means the page has no button to wire up. */
  found: number
  /** How many of those were empty and got the link. */
  filled: number
  /** How many already held something, and were left exactly as they were. */
  kept: number
}

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '')

/** Returns a new page; the input is not touched. */
export const withCheckoutUrl = (content: unknown, url: string): CheckoutResult => {
  const source = (content && typeof content === 'object' ? content : {}) as PageContent
  const blocks = Array.isArray(source.content) ? source.content : []

  let found = 0
  let filled = 0
  let kept = 0

  const next = blocks.map((block) => {
    if (block?.type !== 'PricingCard') return block
    found++
    const props = block.props ?? {}
    if (!isBlank(props.checkoutUrl)) {
      kept++
      return block
    }
    filled++
    return { ...block, props: { ...props, checkoutUrl: url } }
  })

  return { content: { ...source, content: next }, found, filled, kept }
}

/** Undo: clears the link only where it is exactly the one this change wrote. */
export const withoutCheckoutUrl = (content: unknown, url: string): PageContent => {
  const source = (content && typeof content === 'object' ? content : {}) as PageContent
  const blocks = Array.isArray(source.content) ? source.content : []
  return {
    ...source,
    content: blocks.map((block) =>
      block?.type === 'PricingCard' && block.props?.checkoutUrl === url
        ? { ...block, props: { ...block.props, checkoutUrl: '' } }
        : block,
    ),
  }
}
