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
              'A path on this site like /masterclass, or a full address like https://ecommharvest.com/masterclass/register. The https:// is filled in for you.',
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
      /**
       * What the blog calls itself.
       *
       * The URL is /blog and stays /blog — it is what readers and search engines
       * expect, and it is the most linkable path there is. What it is *called*
       * on the page is a branding decision, so it lives here rather than in the
       * code.
       */
      type: 'collapsible',
      label: 'The blog',
      admin: { initCollapsed: true, description: 'The words at the top of /blog. The address stays /blog either way.' },
      fields: [
        {
          name: 'blogHeading',
          label: 'Heading',
          type: 'text',
          admin: {
            description: 'The line at the top of the blog. Leave blank for the default.',
          },
        },
        {
          name: 'blogIntro',
          label: 'Line underneath',
          type: 'textarea',
          maxLength: 300,
          admin: { description: 'One or two sentences on what someone will find there.' },
        },
      ],
    },
    {
      /**
       * The live masterclass, in one place.
       *
       * Its own group rather than a field tucked under advertising, because of
       * when it gets used: at 10:55 on the morning of the event, by someone who
       * is about to present and has one browser tab and no patience. Paste,
       * tick, save — three fields on one screen, in the order they are done.
       *
       * **Site-wide, not per page.** The same link belongs on the masterclass
       * page, the registration page and the thank-you page — the last of which
       * is where a registrant looks first. Held per page it would be three
       * pages to edit and publish while the room is filling up, and the way that
       * goes wrong is that two of them get done.
       */
      type: 'collapsible',
      label: 'The live masterclass',
      admin: { initCollapsed: false },
      fields: [
        {
          /**
           * The switch, and deliberately the *only* thing deciding whether the
           * link is on the page.
           *
           * An earlier version worked it out from the clock — visible from 10:30
           * Mountain, hidden again at 1:00. It was correct and it was the wrong
           * design: it could only ever be right about a date somebody had typed
           * into a source file weeks earlier, and the day the event moves by an
           * hour, the fix is a deploy. A switch is right about whatever is
           * actually happening, and the person who knows that is holding it.
           */
          name: 'showJoinLive',
          label: 'Show the “join live” link',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description:
              'Off until the masterclass is about to start. Tick it on the morning — a few minutes before you open the room — and the link appears under the Save my seat button on the masterclass, registration and thank-you pages. Untick it afterwards.',
          },
        },
        {
          /**
           * In the admin rather than in code: Zoom can hand you a new link on
           * the morning, and "paste it and save" has to work at 10:55 without a
           * deploy, a build, or anybody who knows git.
           */
          name: 'liveJoinUrl',
          label: 'Live webinar link',
          type: 'text',
          validate: (value: unknown) =>
            !value || (typeof value === 'string' && /^https:\/\/\S+$/i.test(value.trim()))
              ? true
              : 'Paste the full link, starting with https://',
          admin: {
            description:
              'The Zoom (or other) link attendees click to join. Safe to paste as soon as you have it — nothing appears on the site until the switch above is on. Only links starting with https:// are accepted.',
          },
        },
        {
          /**
           * Editable because the right words depend on what is happening. "Join
           * the live masterclass" before it starts; "We have started — join us"
           * ten minutes in; "Watch the replay" the next day, pointed at a
           * recording, with no code change and no new field.
           */
          name: 'joinLiveLabel',
          label: 'What the link says',
          type: 'text',
          admin: {
            description:
              'Leave empty for “Already registered? Join the live masterclass →”. Worth changing once you are underway — “We have started — join us →” tells a latecomer they have not missed it.',
          },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Advertising and measurement',
      admin: { initCollapsed: true },
      fields: [
        {
          /**
           * The Meta pixel, off until an ID is entered.
           *
           * A field rather than an environment variable because turning
           * advertising on and off is a marketing decision, not a deploy — and
           * because the privacy policy has to describe whatever is actually
           * loading. Empty means no pixel script reaches the page at all, which
           * is the honest default for a site not running ads.
           */
          name: 'metaPixelId',
          label: 'Meta (Facebook) pixel ID',
          type: 'text',
          validate: (value: unknown) =>
            !value || (typeof value === 'string' && /^\d{10,20}$/.test(value.trim()))
              ? true
              : 'A pixel ID is 15 or 16 digits — just the number, no code.',
          admin: {
            description:
              'From Meta Events Manager. Just the number. Leave empty and no tracking script is loaded at all. In the UK, EU and Switzerland it will not load until a visitor accepts, and anywhere it is switched off for people whose browser sends a Do Not Track / Global Privacy Control signal.',
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
