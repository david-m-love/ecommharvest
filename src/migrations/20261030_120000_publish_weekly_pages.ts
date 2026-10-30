import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { holdUnconfirmedClaims } from '../lib/weekly-publish'

/**
 * Publishes `/join` and `/weekly`.
 *
 * Both were seeded as drafts on purpose — publishing a sales page is a decision
 * made after looking at it. That decision has now been made, so this makes them
 * live, and it does so in the one place a deploy can: a migration, which is how
 * every other change to page content in this project has gone out.
 *
 * **Holds back what is not confirmed.** Before publishing, any section whose own
 * note says it is unconfirmed is switched off — today, the jewellery case study,
 * whose note reads "Definition to be confirmed before publishing" and whose
 * "15x" has no stated definition. Off, not deleted: it is one click to bring back
 * in the builder once the figure has been confirmed. See `lib/weekly-publish.ts`.
 *
 * **Only drafts are published.** A page somebody has already published, or
 * unpublished on purpose since, is left exactly as it is — running this twice, or
 * after somebody has been editing, changes nothing it should not.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  for (const slug of ['weekly', 'join']) {
    const found = await db.execute(sql`SELECT id, content, status FROM pages WHERE slug = ${slug} LIMIT 1`)
    const row = found.rows?.[0] as { id: number; content: unknown; status: string } | undefined

    if (!row) {
      payload.logger.info(`publish: /${slug} does not exist, nothing to publish`)
      continue
    }
    if (row.status !== 'draft') {
      payload.logger.info(`publish: /${slug} is already ${row.status}, left alone`)
      continue
    }

    const stored = typeof row.content === 'string' ? JSON.parse(row.content) : row.content
    const { content, held } = holdUnconfirmedClaims(stored)

    await db.execute(sql`
      UPDATE pages
      SET status = 'published', content = ${JSON.stringify(content)}::jsonb, updated_at = NOW()
      WHERE id = ${row.id}
    `)
    payload.logger.info(
      `publish: /${slug} is live` +
        (held.length ? ` — held back until confirmed: ${held.join(', ')}` : ''),
    )
  }
}

/**
 * Deliberately does nothing.
 *
 * A published page is one somebody decided to put on the internet, and possibly
 * one an advert already points at. Rolling a deploy back must not take it down —
 * the same rule the migration that created these pages follows. Unpublish it in
 * the builder if that is what is wanted.
 */
export async function down({ payload }: MigrateDownArgs): Promise<void> {
  payload.logger.info('publish: not reversed — unpublish the pages in the builder instead')
}
