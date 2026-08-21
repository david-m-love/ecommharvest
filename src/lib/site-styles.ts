import { payload } from '@/lib/entitlements'

/**
 * Reads Site Styles and turns it into a CSS variable override block.
 *
 * The design system in `src/styles/design-system.css` already defines every
 * colour as a custom property on `:root`. So a second `:root` block emitted
 * after it — with only the values that were changed — overrides the palette
 * everywhere at once, with no rebuild and nothing per-component to touch. That
 * is why the answer to "how hard is editable colours" is "easy, globally" and
 * "messy, per section": the design system was built on variables.
 *
 * Failure is deliberately soft. If the global has never been saved, or the
 * database is briefly unreachable, this returns null and the page renders with
 * the built-in palette. A missing colour must never take the site down.
 */

export type SiteStyles = {
  logoUrl: string | null
  logoText: string
  css: string | null
}

/** Maps a Site Styles field onto the design-system variable it overrides. */
const VARIABLES: Record<string, string[]> = {
  gold: ['--gold'],
  goldDeep: ['--gold-deep'],
  // --ink is the same colour as --navy in the design system and is used for
  // body copy on light sections; keeping them together avoids a half-changed
  // look where headings move and text does not.
  navy: ['--navy', '--ink'],
  brown: ['--brown'],
  muted: ['--muted'],
  cream: ['--cream'],
  wash: ['--wash2'],
}

const HEX = /^#[0-9a-fA-F]{6}$/

export const getSiteStyles = async (): Promise<SiteStyles> => {
  const fallback: SiteStyles = { logoUrl: null, logoText: 'eCommHarvest', css: null }

  try {
    const p = await payload()
    const styles = await p.findGlobal({ slug: 'site-styles', depth: 1, overrideAccess: true })
    if (!styles) return fallback

    const declarations: string[] = []
    for (const [field, variables] of Object.entries(VARIABLES)) {
      const value = (styles as unknown as Record<string, unknown>)[field]
      // Re-validated here, not just in the admin: this string is interpolated
      // into a <style> tag, so anything that is not plainly a hex colour is
      // dropped rather than trusted.
      if (typeof value !== 'string' || !HEX.test(value.trim())) continue
      for (const variable of variables) declarations.push(`${variable}:${value.trim()}`)
    }

    const logo = styles.logo
    return {
      logoUrl: typeof logo === 'object' && logo && 'url' in logo ? (logo.url as string) : null,
      logoText: typeof styles.logoText === 'string' && styles.logoText ? styles.logoText : 'eCommHarvest',
      css: declarations.length ? `:root{${declarations.join(';')}}` : null,
    }
  } catch {
    // A page that renders in the default palette beats a page that 500s.
    return fallback
  }
}
