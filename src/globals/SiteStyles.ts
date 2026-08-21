import type { GlobalConfig } from 'payload'

import { isAdmin } from '@/lib/access'
import { can } from '@/lib/capabilities'

/**
 * Site Styles — the logo and the brand palette, in one place.
 *
 * This is the Squarespace split, deliberately: **global** things (logo,
 * colours, fonts) live here and apply everywhere; **local** things (words,
 * links, how many cards) are edited per block in the builder.
 *
 * Why no per-section colour pickers, no padding controls, no corner radius:
 * every one of those is a way to make a page that no longer looks like the rest
 * of the site, and they are the reason DIY pages drift off-brand. Change gold
 * here and every button, chip and eyebrow on every page follows. That is the
 * whole point.
 *
 * The values are prepopulated with the real palette, so this screen starts
 * correct and is a place to *adjust*, not a set of empty boxes to fill.
 */

/** A hex colour field with a real default and a validator. */
const colour = (name: string, label: string, defaultValue: string, description: string) =>
  ({
    name,
    label,
    type: 'text' as const,
    required: true,
    defaultValue,
    // Rejected rather than silently ignored: a typo'd colour makes a CSS
    // variable that resolves to nothing, and the page falls back to browser
    // defaults in one place with no clue why.
    validate: (value: unknown) =>
      typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim())
        ? true
        : 'Use a 6-digit hex colour, like #C99132.',
    admin: { description },
  }) as const

export const SiteStyles: GlobalConfig = {
  slug: 'site-styles',
  label: 'Site Styles',
  admin: {
    group: 'Site',
    description:
      'The logo and colours used across every page. Change one here and it changes everywhere.',
  },
  access: {
    // Public: the front end reads this on every request to build the palette.
    read: () => true,
    update: ({ req }) => isAdmin(req.user) || can(req.user, 'pages:publish'),
  },
  fields: [
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Shown in the top-left of every page that has a Header block. PNG or SVG, transparent background, around 400px wide.',
      },
    },
    {
      name: 'logoText',
      type: 'text',
      defaultValue: 'eCommHarvest',
      admin: {
        description: 'Used as the logo’s alt text, and shown if no logo image is set.',
      },
    },
    {
      type: 'collapsible',
      label: 'Brand colours',
      admin: { initCollapsed: false },
      fields: [
        colour('gold', 'Accent / buttons', '#C99132', 'Buttons, the × in the formula bar, highlights.'),
        colour('goldDeep', 'Accent, darker', '#8B6423', 'Small uppercase labels above headings.'),
        colour('navy', 'Headings and dark sections', '#16324F', 'Headings, and the dark cards.'),
        colour('brown', 'Body text', '#45331B', 'Ordinary paragraph text.'),
        colour('muted', 'Secondary text', '#4E627A', 'Lead paragraphs and quieter text.'),
        colour('cream', 'Chips and highlights', '#F2ECE0', 'The pill behind the badge, the date chip.'),
        colour('wash', 'Off-white background', '#FBF8F3', 'Alternating section backgrounds.'),
      ],
    },
  ],
}
