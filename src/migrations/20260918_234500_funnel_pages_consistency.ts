import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { REGISTER_PAGE, THANKS_PAGE } from '../seed/funnel-pages'
import masterclassContent from '../seed/masterclass.json'

/**
 * Brings the two funnel pages in line with the masterclass they belong to, and
 * takes the replay promise off the site.
 *
 * The replay is the part that matters most. It was promised on the landing
 * page, both funnel pages, the block defaults **and in the terms** — and it is
 * no longer being offered. A stale marketing line is embarrassing; a stale line
 * in a terms of service is a commitment, so that one is not optional to fix.
 *
 * Full replacements, like the content migrations before them. Both funnel pages
 * were restructured rather than reworded — a section removed here, a list
 * rebuilt there — and no find-and-replace produces that. Idempotent by content:
 * nothing is written where the stored page already matches.
 */
const PAGES: { slug: string; content: unknown; description?: string }[] = [
  {
    slug: 'masterclass',
    content: masterclassContent,
  },
  {
    slug: 'masterclass-register',
    content: REGISTER_PAGE,
    description:
      'Save your seat for Your Q4 Profit Playbook — Thursday, September 24 at 11:00 AM ' +
      'Mountain Time. A 60-minute working masterclass plus up to 30 minutes of live Q&A.',
  },
  {
    slug: 'masterclass-thanks',
    content: THANKS_PAGE,
    description: 'Your seat is saved. Check your inbox for the confirmation and the join link.',
  },
]

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  for (const page of PAGES) {
    const found = await db.execute(
      sql`SELECT id, content FROM pages WHERE slug = ${page.slug} LIMIT 1`,
    )
    const row = found.rows?.[0] as { id: number; content: unknown } | undefined
    if (!row) {
      payload.logger.info(`funnel: no /${page.slug} page — the seed carries this copy`)
      continue
    }

    const current = typeof row.content === 'string' ? row.content : JSON.stringify(row.content)
    if (current === JSON.stringify(page.content)) {
      payload.logger.info(`funnel: /${page.slug} already up to date`)
      continue
    }

    if (page.description) {
      await db.execute(sql`
        UPDATE pages
        SET content = ${JSON.stringify(page.content)}::jsonb,
            description = ${page.description},
            updated_at = NOW()
        WHERE id = ${row.id}
      `)
    } else {
      await db.execute(sql`
        UPDATE pages
        SET content = ${JSON.stringify(page.content)}::jsonb, updated_at = NOW()
        WHERE id = ${row.id}
      `)
    }
    payload.logger.info(`funnel: /${page.slug} updated`)
  }

  /**
   * The legal pages are stored content too, and they are the one place a stale
   * promise is genuinely binding. Targeted replacement rather than a rewrite:
   * everything else in those documents should survive untouched.
   */
  const legal = await db.execute(sql`
    UPDATE pages
    SET content = REPLACE(
      REPLACE(
        content::text,
        'We will send a replay to registrants after the event. We aim to run the session as scheduled,',
        'We aim to run the session as scheduled,'
      ),
      'confirmation, reminders, the join link, and the replay',
      'confirmation, reminders and the join link'
    )::jsonb
    WHERE content::text LIKE '%replay%'
    RETURNING slug
  `)
  const slugs = (legal.rows || []).map((row) => (row as { slug: string }).slug)
  payload.logger.info(
    slugs.length
      ? `funnel: replay promise removed from ${slugs.join(', ')}`
      : 'funnel: nothing still promised a replay',
  )
}

/** Not reversible: the previous copy is in each page's version history. */
export async function down({ payload }: MigrateDownArgs): Promise<void> {
  payload.logger.info('funnel: not reversed — restore a previous version in the admin instead')
}
