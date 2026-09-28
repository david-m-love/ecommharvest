import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `pages.kind` — whether a record is a page or a slide deck.
 *
 * It decides which editor the builder opens: page blocks for a page, slide
 * layouts for a deck. Everything already in the table is a page, which is what
 * the default gives it.
 *
 * Hand-trimmed from what `migrate:create` generated. The generator diffs
 * against the last schema snapshot, and three `site_styles` columns had been
 * added by hand since that snapshot was taken — so it also offered to add those
 * again, which would fail on any database that has them. The snapshot beside
 * this file now records them, so the next generated migration starts from the
 * truth.
 *
 * `IF NOT EXISTS` throughout, and the type created inside a `DO` block because
 * Postgres has no `CREATE TYPE IF NOT EXISTS`: a migration that cannot be run
 * twice is a migration that turns one bad deploy into a manual repair.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_pages_kind" AS ENUM('page', 'deck');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "kind" "enum_pages_kind" DEFAULT 'page';
    UPDATE "pages" SET "kind" = 'page' WHERE "kind" IS NULL;
    CREATE INDEX IF NOT EXISTS "pages_kind_idx" ON "pages" USING btree ("kind");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "pages_kind_idx";
    ALTER TABLE "pages" DROP COLUMN IF EXISTS "kind";
    DROP TYPE IF EXISTS "public"."enum_pages_kind";
  `)
}
