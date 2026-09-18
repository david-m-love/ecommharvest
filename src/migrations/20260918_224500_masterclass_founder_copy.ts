import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import masterclassContent from '../seed/masterclass.json'

/**
 * The founder-benefit copy pass: what a Q4 plan is worth to the person making
 * it, not only to the business.
 *
 * A full replacement, like the two content migrations before it, and for the
 * same reason: one of the changes is a *new block* — the "Q4 has a way of taking
 * over" section — and the rest are paragraphs added inside existing ones. There
 * is no find-and-replace that inserts a block, and a half-applied version would
 * leave the page arguing with itself about whether Q4 is an opportunity or a
 * burden.
 *
 * Idempotent by content: nothing is written if the stored page already matches.
 * The previous version stays in the page's history in the admin.
 */
const DESCRIPTION =
  'Thursday, September 24 at 11:00 AM Mountain Time. A free 60-minute working ' +
  'masterclass + 30 minutes of live Q&A for LDS e-commerce founders. Build your ' +
  'Q4 plan before the season starts — so you spend less of it reacting.'

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const found = await db.execute(sql`SELECT id, content FROM pages WHERE slug = 'masterclass' LIMIT 1`)
  const row = found.rows?.[0] as { id: number; content: unknown } | undefined

  if (!row) {
    payload.logger.info('masterclass: no page to update — the seed already carries this copy')
    return
  }

  const current = typeof row.content === 'string' ? row.content : JSON.stringify(row.content)
  if (current === JSON.stringify(masterclassContent)) {
    payload.logger.info('masterclass: already on the founder copy, nothing to do')
    return
  }

  await db.execute(sql`
    UPDATE pages
    SET content = ${JSON.stringify(masterclassContent)}::jsonb,
        description = ${DESCRIPTION},
        updated_at = NOW()
    WHERE id = ${row.id}
  `)
  payload.logger.info(
    `masterclass: founder copy live — ${masterclassContent.content.length} blocks`,
  )
}

/** Not reversible: the previous copy is in the page's version history, not here. */
export async function down({ payload }: MigrateDownArgs): Promise<void> {
  payload.logger.info('masterclass: not reversed — restore a previous version in the admin instead')
}
