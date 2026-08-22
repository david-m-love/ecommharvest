import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

import privacyContent from '../seed/privacy.json'
import termsContent from '../seed/terms.json'

/**
 * Makes /privacy and /terms editable page-builder pages, and restores the one
 * element the masterclass extraction dropped.
 *
 * The legal pages were React components: to change a clause you needed a
 * developer and a deploy, which is the wrong shape for a document that gets
 * revised — especially the one that has to be right before any ad runs. Their
 * content comes from `src/seed/*.json`, extracted from those very components by
 * `scripts/extract-pages.mjs`, so the first version in the builder is the
 * reviewed wording down to the punctuation. That was checked passage by
 * passage: zero paragraphs, list items or headings differ.
 *
 * The masterclass page is *patched*, not replaced. Comparing it against the
 * original showed identical sections and headings and one missing CTA — the
 * "Save my seat" button that sat after the speakers. Replacing the whole page
 * would fix that and silently discard any editing done since, so this reaches
 * into the stored JSON and fills in only that button.
 */

const PAGES = [
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    description:
      'What eCommHarvest collects when you register for the Q4 Revenue Playbook masterclass, why, who it is shared with, and how to ask for it to be deleted.',
    content: privacyContent,
  },
  {
    slug: 'terms',
    title: 'Terms & Conditions',
    description:
      'The terms that apply to registering for and attending the eCommHarvest Q4 Revenue Playbook masterclass.',
    content: termsContent,
  },
]

/** The button that belongs after the speakers, as the original page had it. */
const SPEAKER_CTA = {
  ctaLabel: 'Save my seat',
  ctaHref: 'https://go.ecommharvest.com/register',
  ctaMicro: 'Hosted by Tiny 3D Temples, B.O.M.Socks & Come Follow Me FHE',
}

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  for (const page of PAGES) {
    const existing = await db.execute(sql`SELECT id FROM pages WHERE slug = ${page.slug} LIMIT 1`)
    if ((existing.rows?.length ?? 0) > 0) {
      payload.logger.info(`legal: /${page.slug} already exists, leaving it alone`)
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
        now(),
        now()
      )
    `)
    payload.logger.info(`legal: created /${page.slug} with ${page.content.content.length} blocks`)
  }

  // --- the masterclass page's missing button ------------------------------

  const found = await db.execute(
    sql`SELECT id, content FROM pages WHERE slug = 'masterclass' LIMIT 1`,
  )
  const row = found.rows?.[0] as { id: number; content: unknown } | undefined
  if (!row?.content) {
    payload.logger.info('legal: no masterclass page to patch')
    return
  }

  const data = row.content as { content?: { type?: string; props?: Record<string, unknown> }[] }
  const speakers = data.content?.find((block) => block.type === 'Speakers')
  if (!speakers?.props) {
    payload.logger.info('legal: masterclass page has no speakers block, nothing to patch')
    return
  }
  if (speakers.props.ctaLabel) {
    payload.logger.info('legal: masterclass speakers already has its button')
    return
  }

  Object.assign(speakers.props, SPEAKER_CTA)
  await db.execute(
    sql`UPDATE pages SET content = ${JSON.stringify(data)}::jsonb, updated_at = now() WHERE id = ${row.id}`,
  )
  payload.logger.info('legal: restored the "Save my seat" button after the speakers')
}

/**
 * Removes the legal pages only while they are still the version this created.
 *
 * Same rule as the first seeding migration: a page that has been edited is
 * somebody's work, and a rollback of a schema change is no reason to delete it.
 * The masterclass button is left in place — it belongs to the page now.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM pages
    WHERE slug IN ('privacy', 'terms')
      AND content::text LIKE '%seed-header-legal%'
  `)
}
