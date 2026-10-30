/**
 * The Founder Roadmap: the product facts, in one place.
 *
 * Two pages sell it, `/roadmap` (short) and `/roadmap/preview` (long), and a
 * shared thank-you page follows the checkout. Same reasoning as
 * `src/lib/weekly.ts`: the price and the button text are written here once so
 * the pages cannot quietly disagree about them.
 *
 * No imports, so the rules at the bottom can be tested without React or a
 * database.
 */

export const ROADMAP_NAME = 'The Founder Roadmap'
export const ROADMAP_PRICE = '$500'
export const ROADMAP_CTA = `Get my Roadmap · ${ROADMAP_PRICE}`

/** What the ad account sees as the product when somebody clicks through. */
export const ROADMAP_TRACK_AS = 'eCommHarvest Founder Roadmap'

export const ROADMAP_PATH = '/roadmap'
export const ROADMAP_PREVIEW_PATH = '/roadmap/preview'
export const ROADMAP_THANKS_PATH = '/roadmap/thanks'

/**
 * Where the button goes: the Stripe checkout for the Roadmap.
 *
 * **Empty on purpose.** No checkout link for this product has been supplied, and
 * inventing one is the failure that costs a sale without anybody noticing.
 * While it is empty the button renders as plainly unavailable. Paste the link
 * into the **Checkout URL** field of the price block on both pages; it is the
 * only place that holds it, because the buttons above the price scroll to it.
 */
export const ROADMAP_CHECKOUT_URL = ''
export const ROADMAP_CHECKOUT_MISSING = 'Checkout opens shortly.'

/** Where a visitor who wants the evidence first is sent. */
export const ROADMAP_SOCIAL = {
  kicker: 'A personalized 90-day growth plan',
  when: `${ROADMAP_PRICE} · Two calls, a written plan, no retainer`,
}

// --- the three decisions that are not made yet --------------------------

/**
 * Square-bracket placeholders.
 *
 * Each is a decision David has not made, so each is printed as its own token
 * rather than as a guess. A page that still contains one is not ready to
 * publish, and `findPlaceholders` is how that gets noticed.
 */
export const PLACEHOLDERS = {
  classTime: '[CLASS DAY AND TIME]',
  classTerms: '[CLASS TERMS AFTER MONTH ONE]',
  turnaround: '[TURNAROUND RULE]',
  accessDelay: '[ACCESS DELAY NOTE]',
} as const

export type PlaceholderValues = Partial<Record<keyof typeof PLACEHOLDERS, string>>

/** Square-bracket tokens: capitals and spaces only, so ordinary prose never matches. */
const TOKEN = /\[[A-Z][A-Z ]{3,}\]/g

const walk = (node: unknown, visit: (value: string) => string | void): unknown => {
  if (typeof node === 'string') {
    const next = visit(node)
    return typeof next === 'string' ? next : node
  }
  if (Array.isArray(node)) return node.map((item) => walk(item, visit))
  if (node && typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v, visit)]))
  }
  return node
}

/** Every placeholder token still in a page, each listed once. */
export const findPlaceholders = (content: unknown): string[] => {
  const found = new Set<string>()
  walk(content, (value) => {
    for (const match of value.match(TOKEN) ?? []) found.add(match)
  })
  return [...found]
}

/**
 * Replaces placeholders with decided wording, leaving any still undecided alone.
 *
 * A value is only used when it is non-blank, so half an answer cannot blank out
 * a token that still needs one.
 */
export const fillPlaceholders = <T,>(content: T, values: PlaceholderValues): T => {
  const table = new Map<string, string>()
  for (const key of Object.keys(PLACEHOLDERS) as (keyof typeof PLACEHOLDERS)[]) {
    const value = values[key]
    if (typeof value === 'string' && value.trim()) table.set(PLACEHOLDERS[key], value.trim())
  }
  return walk(content, (value) =>
    value.replace(TOKEN, (token) => table.get(token) ?? token),
  ) as T
}

/**
 * Dashes the copy deck forbids, anywhere in a string.
 *
 * "No em dashes anywhere, including alt text and meta tags." En dashes are
 * included because they read the same on the page.
 */
export const DASHES = /[–—]/

/** Strings in a page that contain a forbidden dash. */
export const findDashes = (content: unknown): string[] => {
  const hits: string[] = []
  walk(content, (value) => {
    if (DASHES.test(value)) hits.push(value)
  })
  return hits
}

/**
 * Buttons that have a label and nowhere to go.
 *
 * A block with a `ctaLabel` and a blank `ctaHref` renders no button at all, so a
 * thank-you page waiting on its questionnaire and booking links looks finished
 * while missing the one thing it is for. Lists them so the gap is visible.
 */
export const findEmptyButtons = (content: unknown): string[] => {
  const blocks = (content as { content?: { type?: string; props?: Record<string, unknown> }[] } | null)?.content ?? []
  const out: string[] = []
  for (const block of blocks) {
    const props = block.props ?? {}
    // The price block keeps its link in `checkoutUrl`, which is reported by its
    // own button, so only blocks that have a `ctaHref` field are checked here.
    if (!('ctaHref' in props)) continue
    const label = typeof props.ctaLabel === 'string' ? props.ctaLabel.trim() : ''
    const href = typeof props.ctaHref === 'string' ? props.ctaHref.trim() : ''
    if (label && !href) out.push(label)
  }
  return out
}
