import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { withCheckoutUrl, withoutCheckoutUrl } from '../lib/weekly-checkout'

/**
 * Points the Join button on `/join` and `/weekly` at the payment page.
 *
 * Until now both buttons were deliberately dead — greyed out, reading "Joining
 * opens shortly" — because nobody had a payment link to give them. This is the
 * link. The address is written **in this file**, not imported from the app, for
 * the usual reason a migration is a record of what ran: if `weekly.ts` changes
 * next year, this must still say what it said today.
 *
 * Fills pricing blocks whose Checkout URL is **empty** and leaves every other one
 * exactly as it is. Somebody may already have pasted a link into the builder, and
 * a deploy that overwrote it would undo their change without telling them.
 *
 * Does not publish anything. Both pages stay whatever they were — drafts, unless
 * somebody has published them since. Putting a sales page on the internet is a
 * decision made after looking at it, not a side effect of a deploy.
 */
const CHECKOUT_URL = 'https://api.shoqwave.com/payment-link/6aba788fbaea3cadef54fb37'

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  for (const slug of ['weekly', 'join']) {
    const found = await db.execute(sql`SELECT id, content, status FROM pages WHERE slug = ${slug} LIMIT 1`)
    const row = found.rows?.[0] as { id: number; content: unknown; status: string } | undefined

    if (!row) {
      payload.logger.info(`checkout: /${slug} does not exist, nothing to link`)
      continue
    }

    const stored = typeof row.content === 'string' ? JSON.parse(row.content) : row.content
    const result = withCheckoutUrl(stored, CHECKOUT_URL)

    if (result.found === 0) {
      payload.logger.warn(`checkout: /${slug} has no pricing block — add one in the builder`)
      continue
    }
    if (result.filled === 0) {
      payload.logger.info(`checkout: /${slug} already has a link, left alone`)
      continue
    }

    await db.execute(sql`
      UPDATE pages SET content = ${JSON.stringify(result.content)}::jsonb, updated_at = NOW()
      WHERE id = ${row.id}
    `)
    payload.logger.info(
      `checkout: /${slug} linked (${result.filled} button section${result.filled === 1 ? '' : 's'}, ${row.status})`,
    )
  }
}

/** Clears the link only where it is exactly this one; a link somebody chose stays. */
export async function down({ db, payload }: MigrateDownArgs): Promise<void> {
  for (const slug of ['weekly', 'join']) {
    const found = await db.execute(sql`SELECT id, content FROM pages WHERE slug = ${slug} LIMIT 1`)
    const row = found.rows?.[0] as { id: number; content: unknown } | undefined
    if (!row) continue
    const stored = typeof row.content === 'string' ? JSON.parse(row.content) : row.content
    await db.execute(sql`
      UPDATE pages SET content = ${JSON.stringify(withoutCheckoutUrl(stored, CHECKOUT_URL))}::jsonb, updated_at = NOW()
      WHERE id = ${row.id}
    `)
  }
  payload.logger.info('checkout: link removed where it was ours')
}
