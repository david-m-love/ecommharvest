import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The column behind Site Styles → "Live webinar join link".
 *
 * Adding a field to a Payload global without adding its column is the failure
 * that took the whole admin down once already, and it is worse than it sounds:
 * Payload selects every column the table declares, so one missing column breaks
 * every *read* of site-styles — the logo, the colours, the menu, the admin
 * screen — not just the new field. It also hides locally, because `push` builds
 * the schema from the config in development and only production runs migrations.
 *
 * `IF NOT EXISTS` so it is safe on a database where `push` has already added it.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_styles" ADD COLUMN IF NOT EXISTS "live_join_url" varchar;
  `)
  payload.logger.info('site styles: live webinar join link is ready to paste in the admin')
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "site_styles" DROP COLUMN IF EXISTS "live_join_url";`)
}
