import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds the column the Meta pixel field has been reading and writing since it
 * shipped, and which no migration ever created.
 *
 * This is the bug the field arrived with. `metaPixelId` was added to Site
 * Styles, local development pushed the column automatically, everything worked
 * — and production, which only ever runs migrations, never got it. Payload
 * selects every column a global declares, so *every read of Site Styles*
 * answered with a Postgres error instead of a row.
 *
 * The symptoms looked nothing like a missing column, which is what made it
 * expensive: the front end catches the failure and falls back, so the logo
 * quietly became the text wordmark on every page, and the Site Styles screen in
 * the admin answered "Nothing found". Nothing anywhere said "column".
 *
 * No data is lost or changed by this — the logo, the colours and the nav links
 * were sitting in the table the whole time, unreadable because of a column
 * beside them. `IF NOT EXISTS` so it is safe on any database that already has
 * it, including one that was dev-pushed.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "site_styles" ADD COLUMN IF NOT EXISTS "meta_pixel_id" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "site_styles" DROP COLUMN IF EXISTS "meta_pixel_id";`)
}
