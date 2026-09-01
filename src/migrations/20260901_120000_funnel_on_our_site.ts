import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import {
  NEW_LANDING_URL,
  NEW_REGISTER_URL,
  OLD_LANDING_URL,
  OLD_REGISTER_URL,
  REGISTER_PAGE,
  THANKS_PAGE,
} from '../seed/funnel-pages'

/**
 * Brings the funnel onto this site: `/register` and `/masterclass/thanks` become
 * page-builder pages with GoHighLevel's form embedded, and every "Save my seat"
 * points at ours instead of at go.ecommharvest.com.
 *
 * Two separate jobs, and the second is the one that matters on a live site:
 * seeding the pages does nothing for anybody until the buttons stop sending
 * people to the old funnel.
 *
 * Both halves are written to be safe on a database that has already been edited.
 * The pages are only created if they are not there; the links are only rewritten
 * where they still point at the old URL.
 */
const PAGES = [
  {
    slug: 'register',
    title: 'Register',
    description:
      'Save your seat for the Q4 Revenue Playbook masterclass. Ninety minutes, live, replay included.',
    content: REGISTER_PAGE,
    // Kept out of search: the masterclass page is the one that should rank, and
    // a thin registration page competing with it helps nobody.
    noindex: true,
  },
  {
    slug: 'masterclass-thanks',
    title: 'Thank you',
    description: 'Your seat is saved. The join link is in your inbox.',
    content: THANKS_PAGE,
    noindex: true,
  },
]

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  for (const page of PAGES) {
    const existing = await db.execute(sql`SELECT id FROM pages WHERE slug = ${page.slug} LIMIT 1`)
    if ((existing.rows?.length ?? 0) > 0) {
      payload.logger.info(`funnel: /${page.slug} already exists, leaving it alone`)
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
        ${page.noindex},
        now(),
        now()
      )
    `)
    payload.logger.info(`funnel: created /${page.slug}`)
  }

  /**
   * Every button that still points at the old funnel.
   *
   * A replacement rather than reseeding the landing pages: they have been edited
   * since, and rewriting them wholesale to change four links would throw that
   * away. Anything already repointed by hand is untouched.
   */
  const relinked = await db.execute(sql`
    UPDATE pages
    SET content = REPLACE(
      REPLACE(content::text, ${OLD_REGISTER_URL}, ${NEW_REGISTER_URL}),
      ${OLD_LANDING_URL}, ${NEW_LANDING_URL}
    )::jsonb
    WHERE content::text LIKE ${'%go.ecommharvest.com%'}
    RETURNING slug
  `)
  const slugs = (relinked.rows || []).map((row) => (row as { slug: string }).slug)
  payload.logger.info(
    slugs.length
      ? `funnel: "Save my seat" now points at ${NEW_REGISTER_URL} on ${slugs.join(', ')}`
      : 'funnel: no page still pointed at the old funnel',
  )
}

/**
 * Reversible only in the part that is safe to reverse.
 *
 * The links go back, because that is a known string swapped for a known string.
 * The pages are left: they may have been edited since, and deleting a page
 * somebody has written on to undo a migration is not a rollback, it is a loss.
 */
export async function down({ db, payload }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE pages
    SET content = REPLACE(content::text, ${NEW_REGISTER_URL}, ${OLD_REGISTER_URL})::jsonb
    WHERE content::text LIKE ${'%' + NEW_REGISTER_URL + '%'}
  `)
  payload.logger.info('funnel: links pointed back at GoHighLevel; the pages were left in place')
}
