import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { REGISTER_URL, THANKS_PATH } from '../lib/event'

/**
 * Every link still pointing at go.ecommharvest.com, wherever it is written.
 *
 * `20260901_120000_funnel_on_our_site` already did this — but only for two
 * *exact* strings, `https://go.ecommharvest.com/register` and `.../masterclass`.
 * A link written any other way went straight past it, and the commonest other
 * way is the one the builder itself suggested: the Button link field's
 * placeholder read `go.ecommharvest.com/register`, with no scheme. Anyone who
 * typed what the box showed them got a link the cleanup could not see.
 *
 * So this matches the address rather than a string: scheme or no scheme, `www.`
 * or not, trailing slash, query, fragment. And it looks in both places a link
 * can live — inside a page's blocks, and in the site menu, which the earlier
 * migration never touched at all. The menu is on every page that shows one, so a
 * stale link there is not one broken button, it is one on every page.
 *
 * Where each goes is decided by its path, not assumed: registration to the
 * registration page, the thank-you to ours, the landing page to `/masterclass`.
 * **Anything else on that host is left alone and named in the log** — a link to
 * some other GoHighLevel page redirected to the registration form would be a
 * confident wrong answer, and this is a week before the event.
 */
const LANDING_URL = 'https://ecommharvest.com/masterclass'
const THANKS_URL = `https://ecommharvest.com${THANKS_PATH}`

/** The whole value is a link to the old funnel — scheme optional, as people write it. */
const GHL = /^(?:https?:\/\/)?(?:www\.)?go\.ecommharvest\.com(\/[^\s"']*)?$/i

/** Where a link on that host should point now, or null to leave it and report it. */
export const retarget = (value: string): string | null => {
  const match = GHL.exec(value.trim())
  if (!match) return null
  const path = (match[1] || '').split(/[?#]/)[0].toLowerCase()

  if (/register|sign-?up|signup/.test(path)) return REGISTER_URL
  if (/thank|thanks/.test(path)) return THANKS_URL
  if (/masterclass|webinar/.test(path)) return LANDING_URL
  // The funnel root was the landing page, which is where the persuading happens.
  if (path === '' || path === '/') return LANDING_URL
  return null
}

/** Rewrites every string in a structure that is a link to the old funnel. */
export const sweep = (node: unknown, found: { from: string; to: string | null }[]): unknown => {
  if (typeof node === 'string') {
    const to = retarget(node)
    if (GHL.test(node.trim())) found.push({ from: node, to })
    return to ?? node
  }
  if (Array.isArray(node)) return node.map((item) => sweep(item, found))
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node as Record<string, unknown>).map(([key, value]) => [
        key,
        sweep(value, found),
      ]),
    )
  }
  return node
}

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const stranded: string[] = []

  // --- the pages -----------------------------------------------------------
  const pages = await db.execute(sql`
    SELECT id, slug, content FROM pages WHERE content::text LIKE ${'%go.ecommharvest.com%'}
  `)

  for (const row of (pages.rows || []) as { id: number; slug: string; content: unknown }[]) {
    const content = typeof row.content === 'string' ? JSON.parse(row.content) : row.content
    const found: { from: string; to: string | null }[] = []
    const next = sweep(content, found)
    const changed = found.filter((link) => link.to)

    if (changed.length) {
      await db.execute(sql`
        UPDATE pages SET content = ${JSON.stringify(next)}::jsonb, updated_at = NOW()
        WHERE id = ${row.id}
      `)
      for (const link of changed) {
        payload.logger.info(`ghl links: /${row.slug} — ${link.from} → ${link.to}`)
      }
    }
    for (const link of found.filter((l) => !l.to)) {
      stranded.push(`/${row.slug}: ${link.from}`)
    }
  }

  // --- the site menu -------------------------------------------------------
  /**
   * Its own table, and its own query. A menu link is not inside the page JSON,
   * which is exactly why the first cleanup missed it: nothing it searched could
   * ever have contained one.
   */
  const nav = await db.execute(sql`
    SELECT id, label, href FROM site_styles_nav_links WHERE href LIKE ${'%go.ecommharvest.com%'}
  `)

  for (const row of (nav.rows || []) as { id: string; label: string; href: string }[]) {
    const to = retarget(row.href)
    if (!to) {
      stranded.push(`site menu "${row.label}": ${row.href}`)
      continue
    }
    await db.execute(sql`UPDATE site_styles_nav_links SET href = ${to} WHERE id = ${row.id}`)
    payload.logger.info(`ghl links: site menu "${row.label}" — ${row.href} → ${to}`)
  }

  if (stranded.length) {
    payload.logger.warn(
      `ghl links: left alone because there is no obvious equivalent here — check these by hand:\n  ${stranded.join('\n  ')}`,
    )
  } else {
    payload.logger.info('ghl links: nothing points at go.ecommharvest.com any more')
  }
}

/**
 * Deliberately not reversible.
 *
 * Going back would mean sending live registration links to a funnel that is no
 * longer the funnel, and the mapping is many-to-one — several old URLs became
 * the same page, so there is no honest way to tell them apart again.
 */
export async function down({ payload }: MigrateDownArgs): Promise<void> {
  payload.logger.info('ghl links: not reversed — the old funnel is not where registration happens')
}
