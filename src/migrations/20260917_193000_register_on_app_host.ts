import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { REGISTER_PATH, REGISTER_URL } from '../lib/event'

/**
 * Points every "Save my seat" on `/masterclass` at one hostname.
 *
 * The buttons held the path `/masterclass/register`, which resolves against
 * whichever host the reader is on. Both hostnames serve this deployment, so the
 * page worked on each — and quietly ran as two funnels: somebody reading
 * `app.ecommharvest.com/masterclass` registered on app, somebody reading
 * `ecommharvest.com/masterclass` registered on the public site, and no report
 * adds those together. A full address picks one, which is the point.
 *
 * **Only the masterclass page.** An unscoped replacement would drag the home
 * page and the thank-you page along with it, and those were not asked about. The
 * `WHERE slug` is doing real work, not tidiness.
 *
 * Idempotent because the search text carries its own quotes: once the value is a
 * full URL, `"/masterclass/register"` — quote, slash — does not appear in it, so
 * a second run matches nothing. Anything already repointed by hand in the
 * builder is likewise left alone.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const quotedPath = `"${REGISTER_PATH}"`
  const quotedUrl = `"${REGISTER_URL}"`

  const changed = await db.execute(sql`
    UPDATE pages
    SET content = REPLACE(content::text, ${quotedPath}, ${quotedUrl})::jsonb,
        updated_at = NOW()
    WHERE slug = 'masterclass' AND content::text LIKE ${`%${quotedPath}%`}
    RETURNING slug
  `)

  payload.logger.info(
    (changed.rows?.length ?? 0) > 0
      ? `register link: /masterclass now sends people to ${REGISTER_URL}`
      : 'register link: nothing on /masterclass still used the bare path',
  )
}

/**
 * Reversible, unusually — and safely.
 *
 * This one is a link swap rather than a rewrite of anyone's words, so putting
 * the path back cannot destroy copy written since. Scoped to the same page and
 * anchored on the same quotes, so it is as narrow going back as coming forward.
 */
export async function down({ db, payload }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE pages
    SET content = REPLACE(content::text, ${`"${REGISTER_URL}"`}, ${`"${REGISTER_PATH}"`})::jsonb
    WHERE slug = 'masterclass'
  `)
  payload.logger.info('register link: /masterclass back to the bare path')
}
