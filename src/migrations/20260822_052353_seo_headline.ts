import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds the search-and-share headline, and fills it in for the pages that exist.
 *
 * Until now one field did two jobs: the name in the builder list *and* the
 * headline in Google results, the browser tab and the preview card of any shared
 * link. Those want opposite things — the list wants "Masterclass", an ad preview
 * wants "Your Q4 Revenue Playbook, Built in 90 Minutes" — so every share card
 * read like a filing label.
 *
 * Seeded only where the column is empty, so a headline written by hand is never
 * overwritten.
 */

const HEADLINES: Record<string, string> = {
  home: 'Better traffic. Bigger orders. More repeat purchases.',
  masterclass: 'Your Q4 Revenue Playbook, Built in 90 Minutes',
  privacy: 'Privacy Policy — eCommHarvest',
  terms: 'Terms & Conditions — eCommHarvest',
}

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  // `IF NOT EXISTS`, because a database that was pushed in development already
  // has the column and this must not fail there.
  await db.execute(sql`ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "seo_title" varchar;`)

  for (const [slug, headline] of Object.entries(HEADLINES)) {
    const result = await db.execute(sql`
      UPDATE pages
      SET seo_title = ${headline}
      WHERE slug = ${slug} AND (seo_title IS NULL OR seo_title = '')
    `)
    if (result.rowCount) payload.logger.info(`seo: headline set for /${slug}`)
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "pages" DROP COLUMN IF EXISTS "seo_title";`)
}
