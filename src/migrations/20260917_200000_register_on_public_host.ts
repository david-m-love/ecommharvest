import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { REGISTER_PATH, REGISTER_URL } from '../lib/event'

/**
 * Moves the "Save my seat" buttons from the app host to the public one.
 *
 * The previous migration pinned them to `app.ecommharvest.com`, which was the
 * wrong half of the site: `app.` is the admin, the builder and the member area —
 * the host you are on while logged in, and therefore the one that ends up on your
 * clipboard. A public campaign belongs on `ecommharvest.com`. That is the name on
 * the ads, and it keeps "app" meaning the private half.
 *
 * **Written to work from either state.** The migration before this shipped
 * minutes earlier, so it may already have run in production or may be about to
 * run in the same deploy. Two swaps rather than one: the app URL if it is there,
 * the bare path if it never got replaced. Whichever the database holds, it ends
 * up saying the same thing, and a second run finds nothing to do.
 *
 * Still scoped to `/masterclass` alone. The home page and the thank-you page were
 * not part of the request and still use the path.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const APP_REGISTER_URL = 'https://app.ecommharvest.com/masterclass/register'

  const swaps: [from: string, label: string][] = [
    [APP_REGISTER_URL, 'the app host'],
    // Quoted, so it cannot match inside a URL that already ends with the path.
    [REGISTER_PATH, 'the bare path'],
  ]

  for (const [from, label] of swaps) {
    const changed = await db.execute(sql`
      UPDATE pages
      SET content = REPLACE(content::text, ${`"${from}"`}, ${`"${REGISTER_URL}"`})::jsonb,
          updated_at = NOW()
      WHERE slug = 'masterclass' AND content::text LIKE ${`%"${from}"%`}
      RETURNING slug
    `)
    if ((changed.rows?.length ?? 0) > 0) {
      payload.logger.info(`register link: /masterclass moved off ${label} → ${REGISTER_URL}`)
    }
  }

  const check = await db.execute(sql`
    SELECT content::text LIKE ${`%"${REGISTER_URL}"%`} AS ok FROM pages WHERE slug = 'masterclass'
  `)
  const ok = (check.rows?.[0] as { ok: boolean } | undefined)?.ok
  payload.logger.info(
    ok === undefined
      ? 'register link: no /masterclass page yet — the seed carries the public address'
      : ok
        ? `register link: /masterclass registers on ${REGISTER_URL}`
        : 'register link: /masterclass has no button using the standard link — check it by hand',
  )
}

/** Back to the app host, which is where the previous migration left it. */
export async function down({ db, payload }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE pages
    SET content = REPLACE(
      content::text,
      ${`"${REGISTER_URL}"`},
      ${'"https://app.ecommharvest.com/masterclass/register"'}
    )::jsonb
    WHERE slug = 'masterclass'
  `)
  payload.logger.info('register link: /masterclass back on the app host')
}
