import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import masterclassContent from '../seed/masterclass.json'

/**
 * The rewritten masterclass page: new copy, new running time, new name.
 *
 * **A wholesale replacement, which the previous content migrations deliberately
 * were not.** Those changed a date or a link and left everything else alone,
 * because overwriting words somebody had edited to fix seven characters is a bad
 * trade. This is the opposite case: the page has been rewritten top to bottom —
 * a new promise ("Q4 Profit Playbook", ninety minutes, a workbook), new sections,
 * a reordered argument — and a find-and-replace cannot produce that. Patching it
 * in pieces would leave a page that is half of each and coherent as neither.
 *
 * What that costs: any wording changed by hand in the builder since the last
 * deploy is replaced. That is the deal a full rewrite makes, and the previous
 * version stays in the page's version history in the admin, so nothing is
 * actually lost — it just stops being live.
 *
 * Idempotent by content rather than by a flag: if the stored page already
 * matches what ships here, nothing is written and nothing is logged as changed.
 */
const DESCRIPTION =
  'Thursday, September 24 at 11:00 AM Mountain Time. A free 90-minute working ' +
  'session for LDS e-commerce founders: build your Q4 promotional calendar, ' +
  'offers, email and SMS plan, traffic priorities and the numbers behind them.'

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const found = await db.execute(sql`SELECT id, content FROM pages WHERE slug = 'masterclass' LIMIT 1`)
  const row = found.rows?.[0] as { id: number; content: unknown } | undefined

  if (!row) {
    payload.logger.info('masterclass: no page to rewrite — the seed already carries this copy')
    return
  }

  const current = typeof row.content === 'string' ? row.content : JSON.stringify(row.content)
  if (current === JSON.stringify(masterclassContent)) {
    payload.logger.info('masterclass: already on the rewritten copy, nothing to do')
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
    `masterclass: rewritten — ${masterclassContent.content.length} blocks, "Q4 Profit Playbook, Built in 90 Minutes"`,
  )
}

/**
 * Deliberately not reversible.
 *
 * There is no "previous copy" to restore from here — the old wording is not in
 * this file, and reconstructing it would mean shipping a second full page in a
 * migration nobody will read. The admin keeps the page's version history, which
 * is the honest way back and the one that shows you what you are restoring.
 */
export async function down({ payload }: MigrateDownArgs): Promise<void> {
  payload.logger.info('masterclass: not reversed — restore a previous version in the admin instead')
}
