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
      /**
       * Sizes by name rather than a free number, for the same reason there are no
       * padding controls: four heights that all look deliberate beat a box that
       * accepts 200 and quietly wrecks a sticky header on a phone. Squarespace
       * gives a slider; it also gives you a site to break. This is the safe
       * version of the same control, and it is global, so both pages stay
       * consistent instead of drifting apart.
       */
      name: 'logoSize',
      label: 'Logo size',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: [
        { label: 'Small', value: 'small' },
        { label: 'Medium', value: 'medium' },
        { label: 'Large', value: 'large' },
        { label: 'Extra large', value: 'xlarge' },
      ],
      admin: {
        description:
          'How tall the logo is in the top-left. Applies to every page. Tall logos are capped on phones so the header cannot swallow the screen.',
      },
    },
    {
      /**
       * The site's menu, in one place.
       *
       * Here rather than on each Header block for the same reason the logo is:
       * a menu that differs per page is a menu people stop trusting, and
       * changing it would mean editing every page. Left empty, the header shows
       * the logo alone — which is right for a landing page whose only job is one
       * button, and is how the masterclass page ships.
       */
      name: 'navLinks',
      label: 'Menu links',
      type: 'array',
      maxRows: 6,
      admin: {
        description:
          'The menu shown in the header of every page. Leave empty for no menu — a landing page usually wants none. Six at most; more than that stops being a menu.',
        initCollapsed: false,
      },
      fields: [
        { name: 'label', type: 'text', required: true, admin: { description: 'What it says.' } },
        {
          name: 'href',
          label: 'Links to',
          type: 'text',
          required: true,
          admin: {
            description:
              'A path on this site like /masterclass, or a full address like https://go.ecommharvest.com/register.',
          },
        },
        {
          name: 'emphasis',
          label: 'Show as a button',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'For the one link that matters most — usually the one that takes a booking.',
          },
        },
      ],
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
