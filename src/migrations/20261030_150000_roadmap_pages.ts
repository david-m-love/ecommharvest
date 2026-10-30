import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { findPlaceholders } from '../lib/roadmap'
import { ROADMAP_PAGES } from '../seed/roadmap-pages'

/**
 * Creates the Founder Roadmap pages: `/roadmap`, `/roadmap/preview` and
 * `/roadmap/thanks`.
 *
 * **Drafts, and they stay drafts.** Three things are still David's to supply
 * before these can be sold from: the Stripe checkout link, the four bracketed
 * decisions (class day and time, class terms after month one, the turnaround
 * rule, the access-delay line), and the real sample pictures and photos. Until
 * then the checkout button says it is not ready and the proof sections publish
 * nothing, and a draft is invisible to the public in any case. Publishing is a
 * decision made in the builder after looking at the page, not a side effect of a
 * deploy; it is also what keeps these out of `sitemap.ts`.
 *
 * **Created, never overwritten.** A page that already exists is left completely
 * alone, the same rule as every other page seed here, so it is safe to keep in
 * the migration list and nobody's edits are ever undone.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  for (const page of ROADMAP_PAGES) {
    const existing = await db.execute(sql`SELECT id FROM pages WHERE slug = ${page.slug} LIMIT 1`)
    if ((existing.rows?.length ?? 0) > 0) {
      payload.logger.info(`roadmap: ${page.path} already exists, leaving it alone`)
      continue
    }

    await db.execute(sql`
      INSERT INTO pages (title, slug, kind, status, seo_title, description, content, noindex, updated_at, created_at)
      VALUES (
        ${page.title},
        ${page.slug},
        'page',
        'draft',
        ${page.seoTitle},
        ${page.description},
        ${JSON.stringify(page.content)}::jsonb,
        ${'noindex' in page ? page.noindex : false},
        NOW(),
        NOW()
      )
    `)
    const open = findPlaceholders(page.content)
    payload.logger.info(
      `roadmap: created ${page.path} as a draft, ${page.content.content.length} sections` +
        (open.length ? `, still to decide: ${open.join(' ')}` : ''),
    )
  }
}

/**
 * Removes the pages, but only while they are still drafts.
 *
 * A published page is one somebody decided to put on the internet, and possibly
 * one an email already links to. Rolling back a deploy must not take that down.
 */
export async function down({ db, payload }: MigrateDownArgs): Promise<void> {
  for (const page of ROADMAP_PAGES) {
    await db.execute(sql`DELETE FROM pages WHERE slug = ${page.slug} AND status = 'draft'`)
  }
  payload.logger.info('roadmap: unpublished drafts removed; anything published was kept')
}
