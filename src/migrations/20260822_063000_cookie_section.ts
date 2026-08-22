import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

import privacyContent from '../seed/privacy.json'

/**
 * Rewrites the cookies section of the privacy policy to match what the code
 * now actually does.
 *
 * The previous wording promised that "where consent is required — the UK, the
 * EU, and US states whose law requires it — the pixel does not load until it is
 * given". That was written before the pixel existed, and it was a promise no
 * code was keeping. What the code does now is narrower and checkable: it honours
 * Global Privacy Control and Do Not Track signals everywhere, asks first in the
 * UK, EEA and Switzerland, and loads elsewhere with the opt-out routes named.
 *
 * A policy that overstates its protections is worse than one that describes them
 * plainly, so the text follows the implementation rather than the other way
 * round — and if the implementation changes, this section has to change with it.
 *
 * Replaces only the blocks whose headings match, so any other editing on the
 * page survives.
 */

const SECTIONS = ['Cookies and tracking']

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const found = await db.execute(sql`SELECT id, content FROM pages WHERE slug = 'privacy' LIMIT 1`)
  const row = (found.rows ?? [])[0] as { id: number; content: unknown } | undefined
  if (!row?.content) {
    payload.logger.info('cookies: no privacy page to update')
    return
  }

  type Block = { type?: string; props?: Record<string, unknown> }
  const stored = row.content as { content?: Block[] }
  const fresh = privacyContent as unknown as { content: Block[] }
  if (!Array.isArray(stored.content)) return

  let changed = 0
  for (const heading of SECTIONS) {
    const target = stored.content.find(
      (block) => block.type === 'LegalText' && block.props?.heading === heading,
    )
    const source = fresh.content.find(
      (block) => block.type === 'LegalText' && block.props?.heading === heading,
    )
    if (!target?.props || !source?.props) continue
    if (target.props.body === source.props.body) continue
    target.props.body = source.props.body
    changed += 1
  }

  if (!changed) {
    payload.logger.info('cookies: the privacy policy already describes the current behaviour')
    return
  }

  await db.execute(
    sql`UPDATE pages SET content = ${JSON.stringify(stored)}::jsonb, updated_at = now() WHERE id = ${row.id}`,
  )
  payload.logger.info(`cookies: rewrote ${changed} section(s) of the privacy policy`)
}

/** Not reversible: the previous text made a promise nothing kept. */
export async function down(_args: MigrateDownArgs): Promise<void> {
  // Intentionally empty.
}
