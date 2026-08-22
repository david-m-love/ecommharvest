import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Puts the real company details into the legal pages.
 *
 * The pages shipped with bracketed placeholders — `[Legal entity name]`,
 * `[registered address]`, `[jurisdiction]` — because nobody had the facts yet.
 * Twelve of them, on the two pages a Meta reviewer reads and a buyer checks
 * before handing over an email address.
 *
 * A find-and-replace on the stored JSON rather than a wholesale content
 * replacement: these pages are editable now, so a rewrite would discard whatever
 * had been changed since. Each replacement is anchored on a placeholder, so it
 * either finds one and fixes it or does nothing.
 *
 * The address is city and state only, deliberately. It is a home address, and
 * publishing a residential street address to satisfy a privacy policy is the
 * wrong trade — the operator is identifiable by entity, city, state and a
 * working contact route, which is what the law is after. The pages say the full
 * postal address is available on request.
 *
 * One thing this cannot fix: **commercial email** (CAN-SPAM) requires a valid
 * physical postal address in the message itself, and "available on request" does
 * not satisfy that. A PO box or a registered-agent address is the usual answer,
 * and it belongs in the GoHighLevel email footer rather than here.
 */

const ENTITY = 'Love Your Marketing LLC'
const EMAIL = 'privacy@ecommharvest.com'

/**
 * Ordered, and anchored on the longest strings first: `[Legal entity name]`
 * appears inside the longer operator sentence, so replacing the short token
 * first would leave the long one unmatched.
 */
const REPLACEMENTS: [string, string][] = [
  // Privacy — who operates the site
  [
    'The site is operated by [Legal entity name], [registered address], trading as eCommHarvest.',
    `The site is operated by ${ENTITY}, an Idaho limited liability company based in Rexburg, Idaho, USA, trading as eCommHarvest.`,
  ],
  // Terms — same, shorter sentence
  [
    'operated by [Legal entity name], trading as eCommHarvest',
    `operated by ${ENTITY}, an Idaho limited liability company, trading as eCommHarvest`,
  ],
  // Contact blocks on both pages
  ['[Legal entity name][Registered address][privacy@yourdomain.com]', `${ENTITY} (trading as eCommHarvest) Rexburg, Idaho, USA ${EMAIL}`],
  ['[Legal entity name][Registered address][hello@yourdomain.com]', `${ENTITY} (trading as eCommHarvest) Rexburg, Idaho, USA ${EMAIL}`],
  ['[Legal entity name]', `${ENTITY} (trading as eCommHarvest)`],
  ['[Registered address]', 'Rexburg, Idaho, USA'],
  ['[registered address]', 'Rexburg, Idaho, USA'],
  ['[privacy@yourdomain.com]', EMAIL],
  ['[hello@yourdomain.com]', EMAIL],
  // Specifics
  ['[e.g. 24 months]', '24 months'],
  ['[e.g. USD 100]', 'USD 100'],
  ['[state / country]', 'State of Idaho, USA'],
  ['[jurisdiction]', 'Madison County, Idaho'],
  [
    'That platform is [webinar platform name] and its own privacy policy applies to that data.',
    'The platform is named in your confirmation email, and its own privacy policy applies to what happens inside the session.',
  ],
  // Decisions that were left open in the draft.
  [
    '[Confirm which of the following is true before launch and delete the other.]',
    'Those brands promote the event; your registration details are not shared with them. They stay with eCommHarvest.',
  ],
  ['[Update this section to match what you actually install.]', ''],
]

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const found = await db.execute(
    sql`SELECT id, slug, content FROM pages WHERE slug IN ('privacy', 'terms')`,
  )

  for (const row of (found.rows ?? []) as { id: number; slug: string; content: unknown }[]) {
    if (!row.content) continue
    const before = JSON.stringify(row.content)
    let after = before

    for (const [placeholder, value] of REPLACEMENTS) {
      // JSON-encoded, so the needle has to be encoded the same way — quotes and
      // curly punctuation inside these strings are escaped in the stored value.
      const needle = JSON.stringify(placeholder).slice(1, -1)
      const replacement = JSON.stringify(value).slice(1, -1)
      after = after.split(needle).join(replacement)
    }

    if (after === before) {
      payload.logger.info(`legal: /${row.slug} already has the real details`)
      continue
    }

    await db.execute(
      sql`UPDATE pages SET content = ${after}::jsonb, updated_at = now() WHERE id = ${row.id}`,
    )
    const remaining = (after.match(/\[[^\]"]{3,40}\]/g) || []).length
    payload.logger.info(
      `legal: filled in /${row.slug}${remaining ? ` — ${remaining} placeholder(s) still there` : ''}`,
    )
  }
}

/**
 * Not reversible, on purpose.
 *
 * The "before" state is placeholders on a published legal page. Putting those
 * back would be a regression dressed up as a rollback.
 */
export async function down(_args: MigrateDownArgs): Promise<void> {
  // Intentionally empty.
}
