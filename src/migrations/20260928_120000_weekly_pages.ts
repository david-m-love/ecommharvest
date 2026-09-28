import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { WEEKLY_PAGES } from '../seed/weekly-pages'

/**
 * Creates `/join` and `/weekly` — the two pages selling eCommHarvest Weekly.
 *
 * **Seeded as drafts.** Both land with empty logo, screenshot and headshot
 * slots, and publishing a sales page is a decision somebody makes after looking
 * at it, not a side effect of a deploy going out. It also keeps them out of
 * `sitemap.ts`, which lists published pages only, so neither is offered to a
 * crawler before it has been read by a person.
 *
 * **Created, never overwritten.** If a page with the slug already exists it is
 * left completely alone — the same rule as every other page seed here, and the
 * reason this is safe to have in the migration list forever. Whoever edits these
 * pages will be editing them the hour after they ship.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  for (const page of WEEKLY_PAGES) {
    const existing = await db.execute(sql`SELECT id FROM pages WHERE slug = ${page.slug} LIMIT 1`)
    if ((existing.rows?.length ?? 0) > 0) {
      payload.logger.info(`weekly: ${page.path} already exists, leaving it alone`)
      continue
    }

    await db.execute(sql`
      INSERT INTO pages (title, slug, status, description, content, noindex, updated_at, created_at)
      VALUES (
        ${page.title},
        ${page.slug},
        'draft',
        ${page.description},
        ${JSON.stringify(page.content)}::jsonb,
        false,
        NOW(),
        NOW()
      )
    `)
    payload.logger.info(
      `weekly: created ${page.path} as a draft — ${page.content.content.length} sections, publish it in the builder`,
    )
  }
}

/**
 * Removes the two pages, but only while they are still drafts.
 *
 * A published page is one somebody decided to put on the internet, and possibly
 * one an ad is already pointing at. Rolling back a deploy should not take that
 * down.
 */
export async function down({ db, payload }: MigrateDownArgs): Promise<void> {
  for (const page of WEEKLY_PAGES) {
    await db.execute(sql`DELETE FROM pages WHERE slug = ${page.slug} AND status = 'draft'`)
  }
  payload.logger.info('weekly: unpublished drafts removed; anything published was kept')
}
