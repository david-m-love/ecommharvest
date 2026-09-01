import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Moves registration from `/register` to `/masterclass/register`.
 *
 * A funnel belongs to a campaign. Flat, `/register` can only ever be one thing —
 * the day there is a second event it has to be taken away from one of them.
 * Nested, `/workshop/register` can exist beside it, and the whole funnel is one
 * prefix in analytics.
 *
 * Runs correctly whichever order it lands in. If the previous migration already
 * created the page as `register`, this renames it; if both run on a fresh
 * database, the rename happens immediately afterwards and nothing is lost.
 * `/register` itself keeps working as a permanent redirect set in
 * `next.config.mjs`.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const renamed = await db.execute(sql`
    UPDATE pages SET slug = 'masterclass-register'
    WHERE slug = 'register'
      AND NOT EXISTS (SELECT 1 FROM pages WHERE slug = 'masterclass-register')
    RETURNING id
  `)
  payload.logger.info(
    (renamed.rows?.length ?? 0) > 0
      ? 'funnel: /register is now /masterclass/register'
      : 'funnel: no page needed renaming',
  )

  /**
   * The buttons.
   *
   * Matched **with the quotes around it**, which is what makes this safe to run
   * twice: a bare `/register` is a substring of `/masterclass/register`, so an
   * unanchored replacement would produce `/masterclass/masterclass/register` on
   * a second run. Quoted, there is nothing left to match once it has run.
   */
  const relinked = await db.execute(sql`
    UPDATE pages
    SET content = REPLACE(content::text, '"/register"', '"/masterclass/register"')::jsonb
    WHERE content::text LIKE '%"/register"%'
    RETURNING slug
  `)
  const slugs = (relinked.rows || []).map((row) => (row as { slug: string }).slug)
  payload.logger.info(
    slugs.length
      ? `funnel: buttons repointed on ${slugs.join(', ')}`
      : 'funnel: no button still pointed at /register',
  )
}

export async function down({ db, payload }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE pages SET slug = 'register' WHERE slug = 'masterclass-register'
  `)
  await db.execute(sql`
    UPDATE pages
    SET content = REPLACE(content::text, '"/masterclass/register"', '"/register"')::jsonb
    WHERE content::text LIKE '%"/masterclass/register"%'
  `)
  payload.logger.info('funnel: registration moved back to /register')
}
