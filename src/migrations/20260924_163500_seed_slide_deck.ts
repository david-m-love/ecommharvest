import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { DECK_BLOCKS, DECK_SLUG } from '../seed/deck'

/**
 * Puts the masterclass deck in the page builder.
 *
 * The deck shipped as a code file — seventeen slides written in JSX, edited by
 * changing the file and deploying. This makes it a record like every other page
 * on the site: open it in the builder, drag a slide, type, upload a picture,
 * Update live page. `/masterclass/slides` reads this row from now on.
 *
 * Seeded from `src/seed/deck.ts`, which the route also falls back to, so a
 * fresh database and this one end up with the same deck rather than two
 * versions of it.
 *
 * Published rather than draft: the deck is the thing being presented, and a
 * draft would be invisible to anyone not signed in — including the browser on
 * the machine running the webinar.
 *
 * Skips if the page already exists, so re-running it cannot overwrite an
 * evening's editing.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const existing = await db.execute(sql`SELECT id FROM pages WHERE slug = ${DECK_SLUG} LIMIT 1`)
  if ((existing.rows?.length ?? 0) > 0) {
    payload.logger.info(`deck: /${DECK_SLUG} already exists, leaving it alone`)
    return
  }

  await db.execute(sql`
    INSERT INTO pages (title, slug, kind, status, description, content, noindex, updated_at, created_at)
    VALUES (
      'Masterclass slides',
      ${DECK_SLUG},
      'deck',
      'published',
      'The deck presented during the Q4 Profit Playbook masterclass.',
      ${JSON.stringify({ root: {}, content: DECK_BLOCKS })}::jsonb,
      true,
      now(),
      now()
    )
  `)
  payload.logger.info(`deck: created /${DECK_SLUG} with ${DECK_BLOCKS.length} slides`)
}

export async function down({ db, payload }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DELETE FROM pages WHERE slug = ${DECK_SLUG} AND kind = 'deck'`)
  payload.logger.info(`deck: removed /${DECK_SLUG}`)
}
