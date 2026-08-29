import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * What the blog calls itself, as a setting rather than a line of code.
 *
 * The address stays /blog — that is what readers and search engines expect and
 * the most linkable path there is. The heading over it is a branding decision,
 * so it belongs in Site Styles. Empty means the built-in wording.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "site_styles" ADD COLUMN IF NOT EXISTS "blog_heading" varchar;`)
  await db.execute(sql`ALTER TABLE "site_styles" ADD COLUMN IF NOT EXISTS "blog_intro" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "site_styles" DROP COLUMN IF EXISTS "blog_heading";`)
  await db.execute(sql`ALTER TABLE "site_styles" DROP COLUMN IF EXISTS "blog_intro";`)
}
