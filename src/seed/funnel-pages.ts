import {
  EVENT_ELSEWHERE,
  EVENT_WHEN,
  MASTERCLASS_FORM_ID,
  REGISTER_PATH,
} from '@/lib/event'

/**
 * The two funnel pages, as page-builder content.
 *
 * They used to be GoHighLevel pages: our HTML pasted above and below GHL's form,
 * on go.ecommharvest.com. Now the pages are ours and only the *form* is theirs,
 * embedded in a block. What changes in practice:
 *
 *  - Everything a visitor reads is edited in the builder, on a phone if need be,
 *    with no paste step and no rebuild.
 *  - The whole funnel is on one domain, so analytics is one funnel rather than
 *    two sites, and nobody hops to a different-looking site mid-registration —
 *    which is where people leave.
 *  - The contact record, the workflows and the email and SMS all still live in
 *    GHL, which is the reason it is in the picture at all.
 *
 * Written as a data structure rather than JSON so the date and the form id come
 * from `src/lib/event.ts` and cannot drift from the rest of the site.
 */

const header = (id: string) => ({
  type: 'Header',
  props: {
    id,
    logoText: 'eCommHarvest',
    homeUrl: 'https://ecommharvest.com/',
    rightText: `${EVENT_WHEN} · free`,
    // A funnel page with a menu is a funnel page with five ways out of it.
    showMenu: false,
  },
})

const footer = (id: string) => ({
  type: 'Footer',
  props: {
    id,
    copyright: '© 2026 eCommHarvest',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms & Conditions', href: '/terms' },
    ],
    note: 'Hosted by Tiny 3D Temples · B.O.M.Socks · Come Follow Me FHE',
  },
})

export const REGISTER_PAGE = {
  root: {},
  content: [
    header('reg-header-0'),
    {
      /**
       * Hero, not PageHeading. PageHeading is the legal-page opener: it sets its
       * body as a monospace, uppercase "last updated" line, which on a
       * registration page reads as a timestamp rather than a sentence. With no
       * button set it renders none — the form below is the button.
       */
      type: 'Hero',
      props: {
        id: 'reg-heading-1',
        eyebrow: 'Free · 90 minutes · replay included',
        heading: 'Save your seat.',
        deck: 'Ninety minutes, live, and you leave with your Q4 mapped out.',
        body: 'The replay goes to everyone who registers, so book it even if the time is awkward.',
        when: `${EVENT_WHEN} ${EVENT_ELSEWHERE}`,
        ctaLabel: '',
        ctaHref: '',
        ctaMicro: '',
      },
    },
    {
      type: 'FormEmbed',
      props: {
        id: 'reg-form-2',
        eyebrow: '',
        heading: '',
        body: '',
        formId: MASTERCLASS_FORM_ID,
        title: 'Masterclass registration',
        minHeight: 620,
        background: 'wash',
      },
    },
    {
      /**
       * Under the form, not above it. Above, it is an obstacle between someone
       * who has decided and the box they came to fill in; below, it is there for
       * the person who scrolled past because they had not decided yet.
       */
      type: 'BulletList',
      props: {
        id: 'reg-bullets-3',
        eyebrow: 'What you walk out with',
        leadIn: 'We build it together, live:',
        bullets: [
          { lead: 'Your promotional calendar', text: 'every promotion, dated, on one page' },
          { lead: 'Your offer strategy', text: 'what the offer is, beyond a discount' },
          { lead: 'Your email + SMS roadmap', text: 'the campaigns, and the flows that must exist first' },
          { lead: 'Your paid social plan', text: 'what to spend, and the rule for when it goes up' },
        ],
      },
    },
    {
      type: 'Prose',
      props: {
        id: 'reg-prose-4',
        eyebrow: 'A note on your details',
        heading: 'We will not sell your email. Obviously.',
        body: 'You get the join link, two reminders and the replay. After that, occasional writing on what is working in e-commerce — and an unsubscribe link on every one of them.\n\nRead the privacy policy for the full version.',
        background: 'white',
      },
    },
    footer('reg-footer-5'),
  ],
}

export const THANKS_PAGE = {
  root: {},
  content: [
    header('thx-header-0'),
    {
      type: 'Hero',
      props: {
        id: 'thx-heading-1',
        eyebrow: 'You are registered',
        heading: 'Your seat is saved.',
        deck: 'The join link is in your inbox now.',
        body: 'Everyone who registers gets the replay too, so a clash on the day is not a problem.',
        when: `${EVENT_WHEN} ${EVENT_ELSEWHERE}`,
        ctaLabel: '',
        ctaHref: '',
        ctaMicro: '',
      },
    },
    {
      /**
       * The one job this page has beyond confirming: getting the email out of
       * the promotions tab. A confirmation nobody finds is a registration that
       * does not turn up.
       */
      type: 'DarkCard',
      props: {
        id: 'thx-card-2',
        eyebrow: 'Do this now, it takes ten seconds',
        heading: 'Check your email and move it to your inbox.',
        body: 'Look for “Your Q4 Revenue Playbook seat is confirmed”. If it landed in Promotions or Spam, drag it to your main inbox — that is what tells your email provider to let the reminders and the join link through on the day.',
        kicker: 'No email after five minutes? Check spam, then write to hello@ecommharvest.com and we will sort it.',
      },
    },
    {
      type: 'BulletList',
      props: {
        id: 'thx-bullets-3',
        eyebrow: 'Before the day',
        leadIn: 'Two things worth doing:',
        bullets: [
          { lead: 'Add it to your calendar', text: 'the confirmation email has the link' },
          { lead: 'Bring your quarter', text: 'whatever the plan currently lives in — notes, a spreadsheet, your head' },
        ],
      },
    },
    {
      type: 'CtaCard',
      props: {
        id: 'thx-cta-4',
        eyebrow: 'While you wait',
        heading: 'Read the thing we will be building.',
        body: 'A short piece on the five decisions that shape a quarter — the same ones we work through live.',
        ctaLabel: 'Read it',
        ctaHref: '/blog',
        note: 'Nothing to buy. See you on the day.',
      },
    },
    footer('thx-footer-5'),
  ],
}

/**
 * Where the CTAs used to point, and where they point now.
 *
 * Two swaps, not one. The registration link is the obvious half; the other is
 * every "see the masterclass" button, which pointed at the GoHighLevel *copy* of
 * the landing page. Leaving those would send people off this site to a second
 * version of a page that also exists here — the one that is no longer edited.
 */
export const OLD_REGISTER_URL = 'https://go.ecommharvest.com/register'
export const NEW_REGISTER_URL = REGISTER_PATH
export const OLD_LANDING_URL = 'https://go.ecommharvest.com/masterclass'
export const NEW_LANDING_URL = '/masterclass'
