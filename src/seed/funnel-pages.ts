import {
  EVENT_ELSEWHERE,
  EVENT_FORMAT,
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
       *
       * It also carries the "join the live masterclass" link when the switch in
       * Site Styles is on, which is why the block earns its place here over
       * anything simpler.
       */
      type: 'Hero',
      props: {
        id: 'reg-heading-1',
        eyebrow: 'Free live masterclass for LDS e-commerce founders',
        heading: 'Your Q4 Profit Playbook',
        deck: 'Build the plan live with us.',
        body:
          'In one focused working session we’ll help you map the offers, promotions, traffic, ' +
          'email and SMS, and conversion priorities that belong in your Q4 plan — while making ' +
          'sure the numbers behind them actually work.' +
          `\n\nA ${EVENT_FORMAT}.`,
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
       * Under the form, not above it. Above, it is an obstacle between somebody
       * who has decided and the box they came to fill in; below, it is there for
       * the person who scrolled past because they had not decided yet.
       *
       * A list rather than the six cards the landing page uses. This page has
       * already done the persuading — it exists to be filled in — so the job here
       * is to be scannable in five seconds, not to be impressive.
       */
      type: 'BulletList',
      props: {
        id: 'reg-bullets-3',
        eyebrow: 'What you’ll work through',
        leadIn: 'Six decisions, made together, live:',
        bullets: [
          {
            lead: 'Q4 promotional calendar',
            text: '— what you’re promoting, when, and why someone should buy now',
          },
          {
            lead: 'Offer strategy',
            text: '— beyond “20% off everything”, without giving away margin you didn’t need to',
          },
          {
            lead: 'Email + SMS plan',
            text: '— the campaigns and follow-up that convert the attention you’re generating',
          },
          {
            lead: 'Traffic + creative priorities',
            text: '— who you’re reaching, what matters to them, and the creative you’ll need',
          },
          {
            lead: 'Conversion priorities',
            text: '— the website fixes worth making before you pour more traffic in',
          },
          {
            lead: 'Know your numbers',
            text: '— what you can actually afford to pay to acquire a customer',
          },
        ],
      },
    },
    {
      /**
       * What the hour is and is not.
       *
       * Said before somebody registers rather than discovered during the session.
       * Sixty minutes cannot make anyone expert in six disciplines, and a page
       * that implies it will is the page whose attendees leave disappointed by
       * something that went well.
       */
      type: 'Prose',
      props: {
        id: 'reg-scope-4',
        eyebrow: 'What to expect',
        heading: 'We’ll move quickly.',
        body:
          'The goal isn’t to make you an expert in every marketing discipline in an hour. It’s ' +
          'to help you make the important Q4 decisions, understand the framework behind them, ' +
          'and know exactly what still needs finishing afterwards.\n\nYou may complete much of ' +
          'the workbook live. We’ll show you what to finish on your own.',
        background: 'wash',
      },
    },
    {
      type: 'Prose',
      props: {
        id: 'reg-qa-5',
        eyebrow: 'And then',
        heading: 'Stay for live Q&A.',
        body:
          'After the working session, David Love and Derek Crimin stay for up to 30 minutes to ' +
          'answer questions about your business — ads, email, creative, offers, conversion, ' +
          'profitability, planning, and whatever else is keeping you stuck heading into Q4.',
        background: 'wash',
      },
    },
    {
      type: 'Prose',
      props: {
        id: 'reg-prose-6',
        eyebrow: 'A note on your details',
        heading: 'We will not sell your email. Obviously.',
        body:
          'You get the join link and a reminder before we start. After that, occasional writing ' +
          'on what is working in e-commerce — and an unsubscribe link on every one of them.' +
          '\n\nRead the privacy policy for the full version.',
        background: 'white',
      },
    },
    footer('reg-footer-7'),
  ],
}

export const THANKS_PAGE = {
  root: {},
  content: [
    header('thx-header-0'),
    {
      /**
       * Confirms, and nothing else. The Hero also renders the "join the live
       * masterclass" link when the switch is on — which is the whole reason this
       * page is the first place a registrant will come back to on the day.
       */
      type: 'Hero',
      props: {
        id: 'thx-heading-1',
        eyebrow: 'You’re in',
        heading: 'Your seat is saved.',
        deck: 'You’re registered for Your Q4 Profit Playbook.',
        body: `A ${EVENT_FORMAT}.`,
        when: `${EVENT_WHEN} ${EVENT_ELSEWHERE}`,
        ctaLabel: '',
        ctaHref: '',
        ctaMicro: '',
      },
    },
    {
      /**
       * The one job this page has beyond confirming.
       *
       * A confirmation nobody finds is a registration that does not turn up, and
       * every step here is really about deliverability: an email moved to the
       * primary inbox, a sender added to contacts and — best of all — a reply
       * are the three strongest signals a mailbox provider takes that the next
       * message should be delivered too.
       *
       * A list rather than prose because these are things to *do*, and because
       * somebody skimming on a phone thirty seconds after registering will read
       * four short lines and not four sentences.
       */
      type: 'BulletList',
      props: {
        id: 'thx-inbox-2',
        eyebrow: 'Important',
        leadIn:
          'First, make sure you got my email. I’ve just sent your confirmation from “David at ' +
          'eCommHarvest”, and it has the link you’ll use to join. If it isn’t there within a few ' +
          'minutes:',
        bullets: [
          { lead: 'Check Spam or Promotions', text: '— that’s usually where it is' },
          { lead: 'Search your inbox', text: 'for “David at eCommHarvest”' },
          {
            lead: 'Move it to your Primary inbox',
            text: 'if you found it anywhere else',
          },
          {
            lead: 'Add david@ecommharvest.com',
            text: 'to your contacts or safe-sender list',
          },
        ],
      },
    },
    {
      type: 'Prose',
      props: {
        id: 'thx-why-3',
        eyebrow: '',
        heading: '',
        body:
          'That’s what keeps the reminder and the join link from getting buried when it’s time ' +
          'to go live.',
        background: 'wash',
      },
    },
    {
      /**
       * The reply.
       *
       * The dark card, because this is the one thing on the page worth
       * interrupting for. It does two jobs at once: a reply is the single
       * strongest deliverability signal a person can send, and the answers decide
       * what gets covered live.
       */
      type: 'DarkCard',
      props: {
        id: 'thx-reply-4',
        eyebrow: 'One more thing',
        heading: 'Hit reply.',
        body:
          'When you find the confirmation email, reply and tell me the single biggest thing you ' +
          'need help figuring out before Q4. Ads, email and SMS, creative, offers, planning, ' +
          'conversion, profitability — whatever is actually on your mind.\n\nI read every reply. ' +
          'If several people are wrestling with the same thing, we’ll make sure we cover it in ' +
          'the masterclass or the live Q&A.',
        kicker: 'Your question may shape what we cover live.',
      },
    },
    {
      type: 'Prose',
      props: {
        id: 'thx-close-5',
        eyebrow: 'That’s it',
        heading: 'See you Thursday.',
        body:
          'Find the email, save it somewhere easy to get back to, and come ready to work.' +
          '\n\nDavid Love, eCommHarvest',
        background: 'white',
      },
    },
    footer('thx-footer-6'),
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
