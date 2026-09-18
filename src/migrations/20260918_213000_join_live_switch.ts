import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The switch and the label behind Site Styles → The live masterclass.
 *
 * The link's own column shipped in `20260918_190000_live_join_url`; this adds
 * the two fields that replaced the clock. `show_join_live` defaults to false in
 * the column as well as in the config, so the link is off on every existing row
 * the moment this runs — a default that only lived in the Payload config would
 * leave rows saved before today with a NULL that nothing had decided the meaning
 * of.
 *
 * `IF NOT EXISTS` so it is safe where `push` has already built the schema, which
 * is every development database.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_styles" ADD COLUMN IF NOT EXISTS "show_join_live" boolean DEFAULT false;
    ALTER TABLE "site_styles" ADD COLUMN IF NOT EXISTS "join_live_label" varchar;
    UPDATE "site_styles" SET "show_join_live" = false WHERE "show_join_live" IS NULL;
  `)
  payload.logger.info('site styles: join-live switch ready — off until somebody ticks it')
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_styles" DROP COLUMN IF EXISTS "show_join_live";
    ALTER TABLE "site_styles" DROP COLUMN IF EXISTS "join_live_label";
  `)
}
