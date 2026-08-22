import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Creates the Site Styles table, and adds the logo size setting.
 *
 * Two things at once, because they are the same omission. Site Styles was added
 * without a migration, so it existed only where the schema is pushed
 * automatically — development. In production the table was never created, every
 * read of it threw, and `getSiteStyles` caught the error and returned the
 * built-in palette. The site looked right, which is exactly why nobody noticed:
 * the brand colours screen appeared to work and changed nothing.
 *
 * So this has to run against two different starting states — a database with
 * the table (pushed in dev) and one without (production) — and it is written to
 * be safe on both. Guards rather than assumptions: `IF NOT EXISTS` throughout,
 * and duplicate-object exceptions swallowed where Postgres has no such clause.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_site_styles_logo_size" AS ENUM('small', 'medium', 'large', 'xlarge');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "site_styles" (
      "id" serial PRIMARY KEY NOT NULL,
      "logo_id" integer,
      "logo_text" varchar DEFAULT 'eCommHarvest',
      "gold" varchar DEFAULT '#C99132' NOT NULL,
      "gold_deep" varchar DEFAULT '#8B6423' NOT NULL,
      "navy" varchar DEFAULT '#16324F' NOT NULL,
      "brown" varchar DEFAULT '#45331B' NOT NULL,
      "muted" varchar DEFAULT '#4E627A' NOT NULL,
      "cream" varchar DEFAULT '#F2ECE0' NOT NULL,
      "wash" varchar DEFAULT '#FBF8F3' NOT NULL,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    ALTER TABLE "site_styles"
      ADD COLUMN IF NOT EXISTS "logo_size" "public"."enum_site_styles_logo_size"
      DEFAULT 'medium' NOT NULL;

    DO $$ BEGIN
      ALTER TABLE "site_styles" ADD CONSTRAINT "site_styles_logo_id_media_id_fk"
        FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "site_styles_logo_idx" ON "site_styles" USING btree ("logo_id");
  `)
}

/**
 * Removes the size setting and leaves the table alone.
 *
 * Payload's generated version dropped the whole table, which would take the
 * brand colours with it — and on a database where this migration only added a
 * column, dropping the table destroys data this migration never created.
 * Reverting a setting should not lose a palette.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_styles" DROP COLUMN IF EXISTS "logo_size";
    DROP TYPE IF EXISTS "public"."enum_site_styles_logo_size";
  `)
}
