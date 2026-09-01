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
  /** What the blog calls itself. Null means "use the built-in wording". */
  blogHeading: string | null
  blogIntro: string | null
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

/**
 * The same four choices, on a phone.
 *
 * Not the desktop numbers, and not one flat cap either. Scaled down, because a
 * 72px logo on a 390px screen is a banner; kept distinct, because the setting
 * has to mean something — it used to be capped at 41px, which made Medium,
 * Large and Extra large identical on every phone and left "make the logo
 * bigger" with no answer.
 *
 * Where a logo is wide enough that these heights would not fit across the
 * screen, the stylesheet's `max-width` reduces the height to keep the
 * proportions. So each value is "this tall, unless that would not fit" — which
 * is why the numbers can be generous without any risk of a logo running into
 * the menu button.
 */
const LOGO_HEIGHTS_MOBILE: Record<string, number> = {
  small: 34,
  medium: 44,
  large: 54,
  xlarge: 64,
}

export const getSiteStyles = async (): Promise<SiteStyles> => {
  const fallback: SiteStyles = { logoUrl: null, logoWidth: null, logoHeight: null, logoText: 'eCommHarvest', navLinks: [], blogHeading: null, blogIntro: null, metaPixelId: null, css: null }

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

    const size = String(styles.logoSize)
    const height = LOGO_HEIGHTS[size] ?? LOGO_HEIGHTS.medium
    declarations.push(`--logo-h:${height}px`)
    declarations.push(`--logo-h-mobile:${LOGO_HEIGHTS_MOBILE[size] ?? LOGO_HEIGHTS_MOBILE.medium}px`)

    /**
     * The logo's shape, as a number, so the stylesheet can work out how tall it
     * may be in the width available. Without it, "too wide to fit" can only be
     * handled by letterboxing — which grows the header without growing the
     * logo. Four is a middling lockup, used only until a logo is uploaded.
     */
    const logoRecord = styles.logo
    const ratio =
      typeof logoRecord === 'object' &&
      logoRecord &&
      typeof logoRecord.width === 'number' &&
      typeof logoRecord.height === 'number' &&
      logoRecord.height > 0
        ? logoRecord.width / logoRecord.height
        : 4
    declarations.push(`--logo-ar:${ratio.toFixed(3)}`)

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
      blogHeading: typeof styles.blogHeading === 'string' && styles.blogHeading.trim() ? styles.blogHeading.trim() : null,
      blogIntro: typeof styles.blogIntro === 'string' && styles.blogIntro.trim() ? styles.blogIntro.trim() : null,
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
  /**
   * The newest few blog posts, for the "Latest from the blog" block.
   *
   * Fetched here rather than in the block for the same reason as the logo: a
   * block renders synchronously and cannot query anything. Four is the most any
   * layout of that block shows.
   */
  recentPosts: RecentPost[]
}

export type RecentPost = {
  title: string
  href: string
  excerpt?: string
  date?: string
  coverUrl?: string
  coverWidth?: number
  coverHeight?: number
}

/**
 * The newest posts, in the shape a block can render.
 *
 * Soft failure, like everything else here: a page that mentions the blog must
 * not stop rendering because the blog could not be read.
 */
const recentPosts = async (): Promise<RecentPost[]> => {
  try {
    const p = await payload()
    const { docs } = await p.find({
      collection: 'posts',
      where: { status: { equals: 'published' } },
      sort: '-publishedAt',
      depth: 1,
      limit: 4,
      overrideAccess: true,
    })
    return docs.map((post) => {
      const cover = post.cover && typeof post.cover === 'object' ? post.cover : null
      return {
        title: post.title,
        href: `/blog/${post.slug}`,
        excerpt: post.excerpt || undefined,
        date: post.publishedAt || post.createdAt || undefined,
        coverUrl: (cover?.url as string) || undefined,
        coverWidth: (cover?.width as number) || undefined,
        coverHeight: (cover?.height as number) || undefined,
      }
    })
  } catch {
    return []
  }
}

export const siteMetadata = async (): Promise<SiteMetadata> => {
  const [{ logoUrl, logoText, logoWidth, logoHeight, navLinks }, posts] = await Promise.all([
    getSiteStyles(),
    recentPosts(),
  ])
  return {
    recentPosts: posts,
    siteLogoUrl: logoUrl,
    siteLogoText: logoText,
    siteLogoWidth: logoWidth,
    siteLogoHeight: logoHeight,
    siteNavLinks: navLinks,
  }
}
