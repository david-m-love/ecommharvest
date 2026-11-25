import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { YOUTUBE_PAGES } from '../seed/youtube-page'

/**
 * Creates `/youtube`, as a draft.
 *
 * A draft because it has no channel link and no videos yet, and publishing a
 * page is a decision made in the builder after looking at it. **Created, never
 * overwritten**: a page with the slug already there is left alone, so the
 * migration is safe to keep forever. Removed on rollback only while still a draft.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  for (const page of YOUTUBE_PAGES) {
    const existing = await db.execute(sql`SELECT id FROM pages WHERE slug = ${page.slug} LIMIT 1`)
    if ((existing.rows?.length ?? 0) > 0) {
      payload.logger.info(`youtube: ${page.path} already exists, leaving it alone`)
      continue
    }
    await db.execute(sql`
      INSERT INTO pages (title, slug, kind, status, seo_title, description, content, noindex, updated_at, created_at)
      VALUES (${page.title}, ${page.slug}, 'page', 'draft', ${page.seoTitle}, ${page.description},
              ${JSON.stringify(page.content)}::jsonb, false, NOW(), NOW())
    `)
    payload.logger.info(`youtube: created ${page.path} as a draft, add the channel link and videos in the builder`)
  }
}

export async function down({ db, payload }: MigrateDownArgs): Promise<void> {
  for (const page of YOUTUBE_PAGES) {
    await db.execute(sql`DELETE FROM pages WHERE slug = ${page.slug} AND status = 'draft'`)
  }
  payload.logger.info('youtube: unpublished draft removed; anything published was kept')
}
