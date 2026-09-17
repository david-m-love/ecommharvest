import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import masterclassContent from '../seed/masterclass.json'

/**
 * Moves the masterclass to 24 September, shortens it to an hour plus Q&A, and
 * replaces the faith section with the one about improving your inputs.
 *
 * Three different jobs, one migration, because they are one edit as far as the
 * live site is concerned: the pages are page-builder pages, their words live in
 * the database, and no amount of editing `src/seed/*.json` changes what is
 * published. Shipping the date without the new section would put a half-updated
 * page in front of the people registering this week.
 *
 * Two techniques, picked per job:
 *
 *   - **Quoted string replacement** for the date and the running time. They
 *     appear in a dozen small strings across two pages, most of which have been
 *     reworded since seeding, and a wholesale replace would throw that away to
 *     fix two words. Anchored on the quotes where it matters, so running twice
 *     changes nothing the second time.
 *   - **A JSON edit** for the section rewrite and the new bullet, because those
 *     are whole blocks rather than words — and because it can check the block
 *     still says what it used to before overwriting it. Reworded by hand in the
 *     builder, and this leaves it alone and says so in the log.
 *
 * The new wording comes from `src/seed/masterclass.json` rather than being
 * retyped here, so a fresh database and an existing one end up with the same
 * page rather than two versions of it that drift.
 */

type Block = { type?: string; props?: Record<string, unknown> }
type PuckPage = { root?: unknown; content?: Block[] }

/** The section as it is written in the seed — the one source for both paths. */
const seedBlocks = (masterclassContent as PuckPage).content ?? []
const findBlock = (type: string, id: string) =>
  seedBlocks.find((block) => block.type === type && block.props?.id === id)

const NEW_CARD = findBlock('DarkCard', 'seed-darkcard-3')?.props
const NEW_BULLETS = findBlock('BulletList', 'seed-bulletlist-4')?.props
const QA_BULLET = (NEW_BULLETS?.bullets as { lead?: string }[] | undefined)?.find((bullet) =>
  bullet.lead?.startsWith('Then your questions'),
)

/** What the old section said, which is how we know nobody has rewritten it. */
const OLD_CARD_EYEBROW = 'Faith first, then strategy'

/**
 * The words, swapped in place.
 *
 * Order matters in one spot: the running time has to become "60 minutes" before
 * anything appends ", plus live Q&A" to it, or the second pass finds nothing.
 */
const SWAPS: [from: string, to: string][] = [
  ['September 10', 'September 24'],
  ['Built in 90 Minutes', 'Built in 60 Minutes'],
  ['90-minute', '60-minute'],
  ['90 minutes', '60 minutes'],
  ['Ninety minutes, live', 'One hour, live'],
  // Anchored on what follows, so there is nothing left to match on a re-run.
  ['Free · 60 minutes · replay', 'Free · 60 minutes, plus live Q&A · replay'],
  ['free · 60 minutes"', 'free · 60 minutes, plus live Q&A"'],
  ['Free · 60 minutes · Thursday', 'Free · 60 minutes, plus live Q&A · Thursday'],
  [
    'special guest Derek Crimin."',
    'special guest Derek Crimin. Both stay for the Q&A."',
  ],
  /**
   * The closing card's paragraph. Long, but it is the last thing somebody reads
   * before the button, and it is where the hour and the Q&A are worth saying in
   * a sentence rather than as small print. Idempotent by construction: the full
   * stop after "you’re in" becomes a dash, so there is nothing left to match.
   */
  [
    'Two fields and you’re in. We’ll send the join link',
    'One hour to build the quarter, then live Q&A with David and Derek for as long as ' +
      'the questions keep coming. Two fields and you’re in — we’ll send the join link',
  ],
]

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  // --- the words ---------------------------------------------------------
  for (const [from, to] of SWAPS) {
    const changed = await db.execute(sql`
      UPDATE pages
      SET content = REPLACE(content::text, ${from}, ${to})::jsonb,
          description = REPLACE(COALESCE(description, ''), ${from}, ${to})
      WHERE content::text LIKE ${`%${from}%`} OR description LIKE ${`%${from}%`}
      RETURNING slug
    `)
    const slugs = (changed.rows || []).map((row) => (row as { slug: string }).slug)
    if (slugs.length) payload.logger.info(`masterclass: "${from}" → "${to}" on ${slugs.join(', ')}`)
  }

  // --- the section, and the Q&A bullet ------------------------------------
  const found = await db.execute(sql`SELECT id, content FROM pages WHERE slug = 'masterclass' LIMIT 1`)
  const row = found.rows?.[0] as { id: number; content: PuckPage } | undefined
  if (!row) {
    payload.logger.info('masterclass: no /masterclass page yet — the seed carries the new wording')
    return
  }

  /**
   * Postgres hands a jsonb column back parsed, but the driver has been known to
   * return it as text. Cheap to accept both rather than crash a deploy over it.
   */
  const page: PuckPage =
    typeof row.content === 'string' ? (JSON.parse(row.content) as PuckPage) : row.content
  const blocks = page.content ?? []
  let touched = false

  const card = blocks.find(
    (block) => block.type === 'DarkCard' && block.props?.eyebrow === OLD_CARD_EYEBROW,
  )
  if (card && NEW_CARD) {
    // The id stays: it is the block's identity in the builder, not part of the
    // copy, and changing it would look like a delete plus an insert in history.
    card.props = { ...NEW_CARD, id: card.props?.id ?? NEW_CARD.id }
    touched = true
    payload.logger.info('masterclass: faith section replaced with "Improving the inputs"')
  } else {
    payload.logger.info(
      card
        ? 'masterclass: dark card found but the new wording is missing — left alone'
        : 'masterclass: no card still says "Faith first" — already updated or reworded, left alone',
    )
  }

  const list = blocks.find((block) => block.type === 'BulletList')
  const bullets = list?.props?.bullets as { lead?: string }[] | undefined
  if (list && bullets && QA_BULLET && !bullets.some((b) => b.lead?.startsWith('Then your questions'))) {
    bullets.push(QA_BULLET)
    touched = true
    payload.logger.info('masterclass: Q&A added to what you’ll learn')
  }

  if (!touched) return
  await db.execute(sql`
    UPDATE pages SET content = ${JSON.stringify(page)}::jsonb, updated_at = NOW()
    WHERE id = ${row.id}
  `)
}

/**
 * Deliberately not reversible.
 *
 * Rolling back would put September 10 — a date that has now passed — and a
 * section nobody wants back into whatever the pages say at the time, including
 * anything written since. A down migration that corrupts live copy to undo a
 * find-and-replace is worse than no down migration; the builder is the way back.
 */
export async function down({ payload }: MigrateDownArgs): Promise<void> {
  payload.logger.info('masterclass: not reversed — edit the page in the builder instead')
}
