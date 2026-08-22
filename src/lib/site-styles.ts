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

export type NavLink = { label: string; href: string; emphasis?: boolean }

export type SiteStyles = {
  logoUrl: string | null
  /** The logo's real pixel size, so the header can reserve its space. */
  logoWidth: number | null
  logoHeight: number | null
  logoText: string
  navLinks: NavLink[]
  /** Empty until advertising is actually running: no ID, no script. */
  metaPixelId: string | null
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

/**
 * Logo heights in pixels, keyed by the names offered in Site Styles.
 *
 * Here rather than in the CSS because the value has to survive being read from
 * the database: an unrecognised name falls back to medium instead of emitting a
 * variable that resolves to nothing, which would collapse the logo to its
 * natural size — usually enormous.
 */
const LOGO_HEIGHTS: Record<string, number> = {
  small: 31,
  medium: 41,
  large: 55,
  xlarge: 72,
}

export const getSiteStyles = async (): Promise<SiteStyles> => {
  const fallback: SiteStyles = { logoUrl: null, logoWidth: null, logoHeight: null, logoText: 'eCommHarvest', navLinks: [], metaPixelId: null, css: null }

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

    const height = LOGO_HEIGHTS[String(styles.logoSize)] ?? LOGO_HEIGHTS.medium
    declarations.push(`--logo-h:${height}px`)

    const logo = styles.logo
    /**
     * Only links with both a label and a destination. A half-filled row in the
     * admin would otherwise render as an empty item or a dead link — worse than
     * not being there.
     */
    const navLinks = (Array.isArray(styles.navLinks) ? styles.navLinks : [])
      .filter((link): link is { label: string; href: string; emphasis?: boolean | null } =>
        Boolean(link && typeof link.label === 'string' && link.label.trim() && typeof link.href === 'string' && link.href.trim()),
      )
      .map((link) => ({
        label: link.label.trim(),
        href: link.href.trim(),
        emphasis: Boolean(link.emphasis),
      }))

    return {
      logoUrl: typeof logo === 'object' && logo && 'url' in logo ? (logo.url as string) : null,
      logoWidth: typeof logo === 'object' && logo && typeof logo.width === 'number' ? logo.width : null,
      logoHeight: typeof logo === 'object' && logo && typeof logo.height === 'number' ? logo.height : null,
      logoText: typeof styles.logoText === 'string' && styles.logoText ? styles.logoText : 'eCommHarvest',
      navLinks,
      // Re-checked here as well as in the admin: this value goes into a script
      // tag, so anything that is not plainly a run of digits is dropped.
      metaPixelId:
        typeof styles.metaPixelId === 'string' && /^\d{10,20}$/.test(styles.metaPixelId.trim())
          ? styles.metaPixelId.trim()
          : null,
      css: declarations.length ? `:root{${declarations.join(';')}}` : null,
    }
  } catch {
    // A page that renders in the default palette beats a page that 500s.
    return fallback
  }
}

/**
 * The shape blocks receive as Puck metadata.
 *
 * A block's render is a plain synchronous component, so it cannot read the
 * database. Anything global a block needs has to be handed to it by whoever
 * renders the page — currently the site logo, which the Header block uses when
 * no per-page logo is chosen. The colours do not travel this way: they are
 * already CSS variables, and CSS reaches every block for free.
 */
export type SiteMetadata = {
  siteLogoUrl: string | null
  siteLogoText: string
  siteLogoWidth: number | null
  siteLogoHeight: number | null
  siteNavLinks: NavLink[]
}

export const siteMetadata = async (): Promise<SiteMetadata> => {
  const { logoUrl, logoText, logoWidth, logoHeight, navLinks } = await getSiteStyles()
  return {
    siteLogoUrl: logoUrl,
    siteLogoText: logoText,
    siteLogoWidth: logoWidth,
    siteLogoHeight: logoHeight,
    siteNavLinks: navLinks,
  }
}
