import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The header button, and dropdowns in the menu.
 *
 * Two columns on `site_styles` for the site-wide button, and a table for the
 * links under a menu item. A menu item's own link stops being NOT NULL, because
 * an item that only opens a dropdown has nowhere of its own to go — the admin
 * still refuses one with neither.
 *
 * Additive: every existing menu link keeps its link, and nothing shows a button
 * until somebody writes one in Site Styles.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "site_styles_nav_links_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  ALTER TABLE "site_styles_nav_links" ALTER COLUMN "href" DROP NOT NULL;
  ALTER TABLE "site_styles" ADD COLUMN "header_cta_label" varchar;
  ALTER TABLE "site_styles" ADD COLUMN "header_cta_href" varchar;
  ALTER TABLE "site_styles_nav_links_children" ADD CONSTRAINT "site_styles_nav_links_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_styles_nav_links"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_styles_nav_links_children_order_idx" ON "site_styles_nav_links_children" USING btree ("_order");
  CREATE INDEX "site_styles_nav_links_children_parent_id_idx" ON "site_styles_nav_links_children" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_styles_nav_links_children" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "site_styles_nav_links_children" CASCADE;
  ALTER TABLE "site_styles_nav_links" ALTER COLUMN "href" SET NOT NULL;
  ALTER TABLE "site_styles" DROP COLUMN "header_cta_label";
  ALTER TABLE "site_styles" DROP COLUMN "header_cta_href";`)
}
