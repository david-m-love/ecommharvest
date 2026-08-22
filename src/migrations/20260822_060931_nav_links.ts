import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * The table behind the site menu.
 *
 * Guarded with `IF NOT EXISTS` throughout, because a database that has been
 * pushed in development already has it and a deploy must not fail there. The
 * menu starts empty on purpose: a landing page whose only job is one button
 * converts better with no menu at all, and this site is a landing page today.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "site_styles_nav_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"emphasis" boolean DEFAULT false
  );
  
  DO $$ BEGIN
    ALTER TABLE "site_styles_nav_links" ADD CONSTRAINT "site_styles_nav_links_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."site_styles"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  CREATE INDEX IF NOT EXISTS "site_styles_nav_links_order_idx" ON "site_styles_nav_links" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "site_styles_nav_links_parent_id_idx" ON "site_styles_nav_links" USING btree ("_parent_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_styles_nav_links" CASCADE;`)
}
