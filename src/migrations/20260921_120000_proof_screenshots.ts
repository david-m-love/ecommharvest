import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import masterclassContent from '../seed/masterclass.json'

/**
 * Adds the proof-screenshots section to the masterclass page.
 *
 * It ships with the copy written and the image slots empty, which is the whole
 * point: the block renders **nothing on the live page** until a screenshot has
 * actually been uploaded, so this can go live now and the section appears the
 * moment somebody drops the files in. A proof section whose proof is a gap is
 * worse than no proof section.
 *
 * A full replacement, like the content migrations before it — the change is a
 * new block in the middle of the page, and there is no find-and-replace that
 * inserts one. Idempotent by content: nothing is written where the stored page
 * already matches.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const found = await db.execute(sql`SELECT id, content FROM pages WHERE slug = 'masterclass' LIMIT 1`)
  const row = found.rows?.[0] as { id: number; content: unknown } | undefined

  if (!row) {
    payload.logger.info('proof: no /masterclass page — the seed already carries the section')
    return
  }

  const current = typeof row.content === 'string' ? row.content : JSON.stringify(row.content)
  if (current === JSON.stringify(masterclassContent)) {
    payload.logger.info('proof: already in place, nothing to do')
    return
  }

  await db.execute(sql`
    UPDATE pages SET content = ${JSON.stringify(masterclassContent)}::jsonb, updated_at = NOW()
    WHERE id = ${row.id}
  `)
  payload.logger.info(
    'proof: section added to /masterclass — hidden until a screenshot is uploaded in the builder',
  )
}

/** Not reversible: the previous copy is in the page's version history. */
export async function down({ payload }: MigrateDownArgs): Promise<void> {
  payload.logger.info('proof: not reversed — restore a previous version in the admin instead')
}
