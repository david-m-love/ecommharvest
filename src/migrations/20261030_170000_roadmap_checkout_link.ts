import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { withCheckoutUrl, withoutCheckoutUrl } from '../lib/weekly-checkout'

/**
 * Points the price button on `/roadmap` and `/roadmap/preview` at the Founder
 * Roadmap payment page.
 *
 * The address is written **in this file**, not imported from the app, because a
 * migration is a record of what ran. Fills price blocks whose Checkout URL is
 * empty and leaves any other one alone: if somebody has already pasted a link in
 * the builder, a deploy must not undo it. Publishes nothing.
 */
const CHECKOUT_URL = 'https://api.shoqwave.com/payment-link/6ae0e24d5b49394de8f57519'

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  for (const slug of ['roadmap', 'roadmap-preview']) {
    const found = await db.execute(sql`SELECT id, content, status FROM pages WHERE slug = ${slug} LIMIT 1`)
    const row = found.rows?.[0] as { id: number; content: unknown; status: string } | undefined

    if (!row) {
      payload.logger.info(`roadmap checkout: ${slug} does not exist, nothing to link`)
      continue
    }

    const stored = typeof row.content === 'string' ? JSON.parse(row.content) : row.content
    const result = withCheckoutUrl(stored, CHECKOUT_URL)

    if (result.found === 0) {
      payload.logger.warn(`roadmap checkout: ${slug} has no price block, add one in the builder`)
      continue
    }
    if (result.filled === 0) {
      payload.logger.info(`roadmap checkout: ${slug} already has a link, left alone`)
      continue
    }

    await db.execute(sql`
      UPDATE pages SET content = ${JSON.stringify(result.content)}::jsonb, updated_at = NOW()
      WHERE id = ${row.id}
    `)
    payload.logger.info(`roadmap checkout: ${slug} linked (${row.status})`)
  }
}

/** Clears the link only where it is exactly this one; a link somebody chose stays. */
export async function down({ db, payload }: MigrateDownArgs): Promise<void> {
  for (const slug of ['roadmap', 'roadmap-preview']) {
    const found = await db.execute(sql`SELECT id, content FROM pages WHERE slug = ${slug} LIMIT 1`)
    const row = found.rows?.[0] as { id: number; content: unknown } | undefined
    if (!row) continue
    const stored = typeof row.content === 'string' ? JSON.parse(row.content) : row.content
    await db.execute(sql`
      UPDATE pages SET content = ${JSON.stringify(withoutCheckoutUrl(stored, CHECKOUT_URL))}::jsonb, updated_at = NOW()
      WHERE id = ${row.id}
    `)
  }
  payload.logger.info('roadmap checkout: link removed where it was ours')
}
