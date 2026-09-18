import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import masterclassContent from '../seed/masterclass.json'

/**
 * The final format on the live page: 60-minute working masterclass + 30 minutes
 * of live Q&A, and a headline that says sixty rather than ninety.
 *
 * A full replacement again, for the same reason as the rewrite before it: the
 * headline, the hero, the format section and the closing card all changed
 * together, and stitching four find-and-replaces over a page would leave the
 * halves disagreeing about how long the event is — which is the exact confusion
 * this change exists to remove.
 *
 * Idempotent by content: if the stored page already matches what ships here,
 * nothing is written. The admin keeps the previous version either way.
 */
const DESCRIPTION =
  'Thursday, September 24 at 11:00 AM Mountain Time. A free 60-minute working ' +
  'masterclass + 30 minutes of live Q&A for LDS e-commerce founders: build your ' +
  'Q4 promotional calendar, offers, email and SMS plan, traffic priorities and ' +
  'the numbers behind them.'

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const found = await db.execute(sql`SELECT id, content FROM pages WHERE slug = 'masterclass' LIMIT 1`)
  const row = found.rows?.[0] as { id: number; content: unknown } | undefined

  if (!row) {
    payload.logger.info('masterclass: no page to update — the seed already carries this format')
    return
  }

  const current = typeof row.content === 'string' ? row.content : JSON.stringify(row.content)
  if (current === JSON.stringify(masterclassContent)) {
    payload.logger.info('masterclass: already on the 60 + 30 format, nothing to do')
    return
  }

  await db.execute(sql`
    UPDATE pages
    SET content = ${JSON.stringify(masterclassContent)}::jsonb,
        description = ${DESCRIPTION},
        updated_at = NOW()
    WHERE id = ${row.id}
  `)
  payload.logger.info('masterclass: 60-minute working masterclass + 30 minutes of live Q&A')
}

/** Not reversible: the previous copy is in the page's version history, not here. */
export async function down({ payload }: MigrateDownArgs): Promise<void> {
  payload.logger.info('masterclass: not reversed — restore a previous version in the admin instead')
}
