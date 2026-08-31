import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Moves the masterclass from 3 September to 10 September.
 *
 * The date is in three kinds of place, and only one of them is code:
 *
 *   1. Code — the structured data, the calendar file, the block defaults. Those
 *      come from `src/lib/event.ts` now and ship with the deploy.
 *   2. **The stored pages** — `/` and `/masterclass` are page-builder pages, so
 *      their words live in the database and no amount of editing the code
 *      changes what is on the live site. That is what this fixes.
 *   3. GoHighLevel, which is pasted by hand and cannot be reached from here.
 *
 * A targeted replacement rather than rewriting the pages wholesale: the pages
 * have been edited since they were seeded, and replacing them would throw that
 * away to fix seven words. Anything already reworded is left alone — which also
 * means this is safe to run twice, and a no-op if the date was already changed
 * by hand in the builder.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const pages = await db.execute(sql`
    UPDATE pages
    SET content = REPLACE(content::text, 'September 3', 'September 10')::jsonb,
        description = REPLACE(COALESCE(description, ''), 'September 3', 'September 10')
    WHERE content::text LIKE '%September 3%' OR description LIKE '%September 3%'
    RETURNING slug
  `)

  const changed = (pages.rows || []).map((row) => (row as { slug: string }).slug)
  payload.logger.info(
    changed.length
      ? `masterclass date: moved to 10 September on ${changed.join(', ')}`
      : 'masterclass date: nothing said 3 September, leaving the pages alone',
  )
}

/**
 * Deliberately not reversible.
 *
 * Rolling back would put "September 3" into whatever the pages say *now*,
 * including any wording written since. A down migration that corrupts content to
 * undo a find-and-replace is worse than no down migration.
 */
export async function down({ payload }: MigrateDownArgs): Promise<void> {
  payload.logger.info('masterclass date: not reversed — edit the pages in the builder instead')
}
