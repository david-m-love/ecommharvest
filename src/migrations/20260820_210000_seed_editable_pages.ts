import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

import homeContent from '../seed/home.json'
import masterclassContent from '../seed/masterclass.json'

/**
 * Installs the home page and the masterclass page as editable page-builder
 * pages, with the content of the pages that already existed.
 *
 * A data migration rather than a seed script, for one practical reason: Vercel
 * runs `payload migrate` on every deploy, so this happens by itself and exactly
 * once. A seed script would need someone to remember to run it against
 * production, holding the connection string — which is precisely the kind of
 * manual step that does not get done.
 *
 * The layouts come from `src/seed/*.json`, extracted from the hand-built pages
 * by `scripts/extract-pages.mjs`. So the first version of each page in the
 * builder *is* the page that was live, down to the curly quotes — not a retyped
 * approximation that quietly loses a paragraph.
 *
 * Idempotent by slug: if a page with that slug already exists — because someone
 * created one by hand, or this ran before — it is left completely alone. A
 * migration must never overwrite content a person has edited.
 */

const PAGES = [
  {
    slug: 'home',
    title: 'Home',
    description:
      'The strategy behind the quarter that decides your year: the promotional calendar, the offers, the email and SMS flows, and the paid social that makes all three cheaper.',
    content: homeContent,
  },
  {
    slug: 'masterclass',
    title: 'Masterclass',
    description:
      'Thursday, September 3 at 11:00 AM MT. A free 90-minute masterclass for LDS e-commerce founders. Build your Q4 promotional calendar, offers, email and SMS plan in one sitting.',
    content: masterclassContent,
  },
]

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  for (const page of PAGES) {
    // Interpolations in Drizzle's `sql` tag are bound parameters, not string
    // concatenation, so the JSON payload cannot break out of the statement.
    const existing = await db.execute(
      sql`SELECT id FROM pages WHERE slug = ${page.slug} LIMIT 1`,
    )
    if ((existing.rows?.length ?? 0) > 0) {
      payload.logger.info(`seed: /${page.slug} already exists, leaving it alone`)
      continue
    }

    await db.execute(sql`
      INSERT INTO pages (title, slug, status, description, content, noindex, updated_at, created_at)
      VALUES (
        ${page.title},
        ${page.slug},
        'published',
        ${page.description},
        ${JSON.stringify(page.content)}::jsonb,
        false,
        NOW(),
        NOW()
      )
    `)
    payload.logger.info(
      `seed: created /${page.slug} with ${page.content.content.length} editable blocks`,
    )
  }
}

/**
 * Removes only the two seeded pages, and only if they still carry seeded block
 * ids — the marker `scripts/extract-pages.mjs` writes. Editing a page in the
 * builder rewrites those ids, so a page someone has worked on survives a
 * rollback rather than being deleted along with their afternoon.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const page of PAGES) {
    await db.execute(sql`
      DELETE FROM pages
      WHERE slug = ${page.slug} AND content::text LIKE '%seed-header-0%'
    `)
  }
}
