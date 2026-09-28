import {
  JOIN_PATH,
  WEEKLY_CHECKOUT_URL,
  WEEKLY_CTA,
  WEEKLY_CTA_PRICED,
  WEEKLY_INTERVAL,
  WEEKLY_MICRO,
  WEEKLY_NAME,
  WEEKLY_PRICE,
  WEEKLY_TERMS,
  WEEKLY_TITLE,
} from '@/lib/weekly'

/**
 * The two pages that sell eCommHarvest Weekly.
 *
 * `/join` is the short one — only the pieces that carry conversion weight, so it
 * can go live in a day. `/weekly` is the long one, proof-heavy, improved after
 * launch. Both are built from the same blocks and read the price from
 * `src/lib/weekly.ts`, so the thing that must never differ cannot.
 *
 * **Every claim here is one David supplied.** The three case studies, the price
 * and Mitch's testimonial. Logos, screenshots, headshots and further
 * testimonials are empty arrays: those sections publish nothing until somebody
 * uploads something, which is why both pages are honest the day they land and
 * get stronger rather than more accurate as they fill up.
 *
 * Written as a data structure rather than JSON so the price and the button text
 * come from one place — the same reason `src/seed/funnel-pages.ts` is TypeScript.
 */

/**
 * No menu on either page.
 *
 * A page whose only job is one decision should not offer five other ones. Same
 * rule as the masterclass funnel.
 */
const header = (id: string) => ({
  type: 'Header',
  props: {
    id,
    logoText: 'eCommHarvest',
    homeUrl: 'https://ecommharvest.com/',
    rightText: `${WEEKLY_PRICE}${WEEKLY_INTERVAL} · cancel anytime`,
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
    note: 'eCommHarvest is a trading name of Love Your Marketing LLC.',
  },
})

/**
 * The hero button is an anchor, not a link out.
 *
 * `#join` scrolls to the pricing card, which is the one place on the page
 * holding the checkout URL. Two buttons with two URL fields is two things to
 * paste and one silent way for them to disagree.
 */
const JOIN_ANCHOR = '#join'

/** Mitch's words, exactly as given. Nothing here is paraphrased. */
const MITCH = {
  quote:
    'If you’re looking for a marketer that’s actually done it, this is your guy. David Love understands how to build a brand from scratch. With a handful of his own stores, he understands what it takes to start, grow, and even sell a business. A great asset for my Shopify store.',
  name: 'Mitch Adams',
  business: 'LDS Paint By Numbers',
  title: '',
  href: '',
  photo: undefined,
}

/** The sock brand. David's figures, with the year-over-year framing he gave. */
const SOCKS = {
  eyebrow: 'Case study',
  heading: 'Dress sock brand grows November revenue 144% year over year.',
  body:
    'We combined Meta advertising, email marketing, conversion optimisation and promotional planning to grow November revenue from approximately $90,000 to $213,024 year over year.',
  statBefore: '~$90,000',
  statAfter: '$213,024',
  statChange: '+144% YoY',
  note: 'November 2024 compared with November 2025, same store.',
}

const KLAVIYO = {
  eyebrow: 'Case study',
  heading: 'Klaviyo attributed about $26,000 a month to one advanced email flow.',
  /**
   * "Attributed" is load-bearing and stays in the headline as well as the body.
   * Klaviyo's number is what its own attribution window credits to the flow, not
   * a measured lift against a holdout — and describing it as revenue the flow
   * *caused* would be a claim the data does not make.
   */
  body:
    'We found a significant gap in a floating-shelf brand’s Klaviyo account and built an eight-email flow for one of its primary product lines. The flow later reported approximately $26,000 per month in attributed revenue.',
  statBefore: '',
  statAfter: '~$26,000',
  statChange: 'per month, attributed',
  note: 'Revenue as attributed by Klaviyo, not a measured incremental lift.',
}

const JEWELRY = {
  eyebrow: 'Case study',
  heading: 'Jewellery brand sees 15x return from an email marketing buildout.',
  body:
    'Popup strategy, a welcome flow, abandoned cart, and regular campaigns — built from scratch and then run as an ongoing programme.',
  statBefore: '',
  statAfter: '15x',
  statChange: 'return',
  note: 'Return as reported by the brand’s email platform. Definition to be confirmed before publishing.',
}

const caseStudy = (
  id: string,
  content: typeof SOCKS,
  background: 'white' | 'wash',
) => ({
  type: 'CaseStudy',
  props: { id, show: true, shots: [], background, ...content },
})

const testimonials = (
  id: string,
  { eyebrow = '', heading = '', items }: { eyebrow?: string; heading?: string; items: unknown[] },
) => ({ type: 'Testimonials', props: { id, show: true, eyebrow, heading, items } })

/** Empty until logos are uploaded, at which point the whole bar appears. */
const logoTicker = (id: string) => ({
  type: 'LogoTicker',
  props: {
    id,
    show: true,
    heading: 'E-commerce brands I’ve had the opportunity to work with',
    logos: [],
  },
})

const pricing = (id: string, benefits: { text: string }[]) => ({
  type: 'PricingCard',
  props: {
    id,
    show: true,
    eyebrow: 'The offer',
    name: WEEKLY_NAME,
    price: WEEKLY_PRICE,
    interval: WEEKLY_INTERVAL,
    compareAt: '',
    body: 'Weekly access. Real questions. Real businesses. Practical marketing help.',
    benefits,
    ctaLabel: WEEKLY_CTA,
    checkoutUrl: WEEKLY_CHECKOUT_URL,
    terms: WEEKLY_TERMS,
    risk: 'No long-term contract. Cancel anytime.',
    founding: '',
    cap: '',
    urgency: '',
  },
})

/**
 * Questions people ask. Several have no answer yet — when the calls are, whether
 * there is a community — and an entry with no answer does not publish. They sit
 * in the builder as a list of what still needs deciding.
 */
const FAQ_FULL = [
  {
    q: 'What happens on the weekly call?',
    a: 'You bring a real question about your business — a promotion you are planning, an ad account that is not working, an email you are not sure how to write, a launch you are sizing up. We work through it together, out loud, and you leave knowing what to do next.',
  },
  {
    q: 'What kinds of businesses is this for?',
    a: 'E-commerce businesses with products shipping and traffic arriving. You do not need to be large. You do need something real to work on.',
  },
  {
    q: 'Do I need to be a member of The Church of Jesus Christ of Latter-day Saints?',
    a: 'No. The community is built for Latter-day Saint founders, and that shapes the room — but nobody is asked about it, and the marketing advice is the same either way.',
  },
  {
    q: 'Is this a course?',
    a: 'No. There is no curriculum to work through and no library to fall behind on. It is a standing appointment with someone who has run these businesses, about the one you are running.',
  },
  {
    q: 'Will you personally answer questions?',
    a: 'Yes. That is the whole product.',
  },
  { q: 'When are the calls?', a: '' },
  { q: 'What happens if I miss a call?', a: '' },
  { q: 'Is there a private community?', a: '' },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. It is a monthly membership with no contract and no minimum term. Cancel and you are not billed again.',
  },
  {
    q: 'Is this the same as hiring you as my fractional CMO?',
    a: 'No. A fractional CMO engagement means I am inside your business, in your accounts, accountable for the work. This is weekly access to the same thinking, shared with a room of other founders, at a fraction of the cost.',
  },
]

// --- /join — the short page ----------------------------------------------

export const JOIN_PAGE = {
  root: {},
  content: [
    header('join-header-0'),
    {
      type: 'Hero',
      props: {
        id: 'join-hero-1',
        show: true,
        eyebrow: WEEKLY_NAME,
        heading: `${WEEKLY_TITLE}.`,
        deck: 'Weekly group coaching for LDS e-commerce founders who want experienced help deciding what to do next.',
        body: '',
        when: '',
        ctaLabel: `Join for ${WEEKLY_PRICE}${WEEKLY_INTERVAL}`,
        ctaHref: JOIN_ANCHOR,
        ctaMicro: WEEKLY_MICRO,
        image: undefined,
      },
    },
    logoTicker('join-logos-2'),
    testimonials('join-quote-3', { items: [MITCH] }),
    {
      type: 'BulletList',
      props: {
        id: 'join-what-4',
        show: true,
        eyebrow: 'What you get',
        leadIn: 'Once a week, bring me the problem you are trying to solve:',
        bullets: [
          { lead: 'Ads', text: '— what to run, what to change, what to stop' },
          { lead: 'Email and SMS', text: '— campaigns, flows, and what to send this week' },
          { lead: 'Promotions and launches', text: '— what to run, when, and at what offer' },
          { lead: 'Offers', text: '— beyond a discount, without giving away margin' },
          { lead: 'Conversion', text: '— what is costing you orders you already paid for' },
          { lead: 'Planning and prioritisation', text: '— which project actually comes first' },
          {
            lead: 'One live group call every week',
            text: '— plus community access',
            /**
             * Switched on, but easy to switch off: the community may not exist on
             * launch day, and this is the line that would become untrue first.
             */
            show: true,
          },
        ],
      },
    },
    caseStudy('join-case-5', { ...SOCKS, heading: 'From ~$90K to $213K in November revenue.' }, 'white'),
    {
      type: 'Speakers',
      props: {
        id: 'join-david-6',
        show: true,
        eyebrow: '',
        heading: 'I’ve been on both sides of the table.',
        ctaLabel: '',
        ctaHref: '',
        ctaMicro: '',
        people: [
          {
            label: '',
            name: 'David Love',
            title: 'E-commerce founder + growth strategist',
            monogram: 'DL',
            body: 'I have built e-commerce businesses, operated them, marketed them and sold one. Now I work across multiple e-commerce brands — on the marketing systems behind them: Meta advertising, email and SMS, offers and conversion.\n\nSo when you bring me a problem, you are not getting it read off a textbook by somebody who has never had to make payroll from a promotion that did not land.',
          },
        ],
      },
    },
    pricing('join-price-7', [
      { text: 'One live group strategy call every week' },
      { text: 'Bring your store, your numbers and your actual question' },
      { text: 'Feedback on ads, email, offers, promotions and your website' },
      { text: 'Learn from the questions other founders bring' },
    ]),
    {
      type: 'Faq',
      props: {
        id: 'join-faq-8',
        show: true,
        eyebrow: 'Questions',
        heading: 'Before you join.',
        items: FAQ_FULL.slice(0, 5),
      },
    },
    footer('join-footer-9'),
  ],
}

// --- /weekly — the full page ----------------------------------------------

export const WEEKLY_PAGE = {
  root: {},
  content: [
    header('wk-header-0'),
    {
      type: 'Hero',
      props: {
        id: 'wk-hero-1',
        show: true,
        eyebrow: WEEKLY_NAME,
        heading: `${WEEKLY_TITLE}.`,
        deck: 'Weekly e-commerce coaching for LDS founders who want help knowing what to do next, what matters most, and how to grow profitably.',
        body: 'You don’t need another giant course.\n\nYou need somewhere to bring the question you’re wrestling with right now — your promotion, Meta ads, email strategy, product launch, conversion rate, offer, or marketing plan — and get experienced eyes on it.',
        when: '',
        ctaLabel: WEEKLY_CTA_PRICED,
        ctaHref: JOIN_ANCHOR,
        ctaMicro: WEEKLY_MICRO,
        image: undefined,
      },
    },
    /**
     * Proof before explanation, deliberately. A stranger's first question is
     * "who is this and why would I pay him monthly?", and the strip plus the
     * logos answer part of it before they have read a paragraph.
     */
    {
      type: 'StatStrip',
      props: {
        id: 'wk-stats-2',
        show: true,
        eyebrow: 'Who you’re listening to',
        heading: 'Advice from someone who’s actually been in the arena.',
        stats: [
          { value: '', label: 'Built and operated e-commerce businesses' },
          { value: '', label: 'Sold an e-commerce business' },
          { value: '', label: 'Fractional CMO to multiple Shopify brands' },
          { value: '', label: 'Meta ads, Klaviyo and conversion work' },
        ],
      },
    },
    logoTicker('wk-logos-3'),
    {
      type: 'Prose',
      props: {
        id: 'wk-problem-4',
        show: true,
        eyebrow: 'The real problem',
        heading: 'You probably don’t need more information. You need help deciding what to do.',
        body: 'As a founder you’re responsible for the product, the inventory, the customers, the operations and the people — and somehow you’re also supposed to become an expert marketer.\n\nIt’s easy to spend 80% of your time building the product and 20% actually marketing it.\n\neCommHarvest Weekly gives you a regular place to step out of product mode, look at the business, and decide what marketing deserves your attention next.',
        background: 'white',
      },
    },
    {
      type: 'QuestionList',
      props: {
        id: 'wk-questions-5',
        show: true,
        eyebrow: 'Bring the real one',
        heading: 'The questions people actually turn up with.',
        body: '',
        questions: [
          { text: 'Should I run this promotion?' },
          { text: 'Why aren’t my Meta ads working?' },
          { text: 'What should I email my list this week?' },
          { text: 'How should I launch this new product?' },
          { text: 'Is my website the problem?' },
          { text: 'Should I raise my price?' },
          { text: 'Which marketing project should I work on first?' },
          { text: 'What should my Q4 plan actually look like?' },
        ],
      },
    },
    {
      type: 'BulletList',
      props: {
        id: 'wk-week-6',
        show: true,
        eyebrow: 'What happens each week',
        leadIn: 'Bring the business. We’ll work through it together.',
        bullets: [
          { lead: 'A weekly live group strategy call', text: '— one session, every week', show: true },
          { lead: 'Ask your current questions', text: '— about the business you are actually running', show: true },
          { lead: 'Feedback on promotions and launches', text: '— before you run them, not after', show: true },
          { lead: 'Review ads, email, website or offers', text: '— bring the account or the page', show: true },
          { lead: 'Learn from the room', text: '— other founders’ questions are usually yours too', show: true },
          { lead: 'Community access', text: '— somewhere to ask between calls', show: true },
          { lead: 'Accountability', text: '— to actually market the business, not just build it', show: true },
        ],
      },
    },
    caseStudy('wk-case-7', SOCKS, 'white'),
    testimonials('wk-quote-8', { items: [MITCH] }),
    caseStudy('wk-case-9', KLAVIYO, 'white'),
    caseStudy('wk-case-10', JEWELRY, 'wash'),
    {
      type: 'Speakers',
      props: {
        id: 'wk-david-11',
        show: true,
        eyebrow: 'Who you’re working with',
        heading: 'I’m not teaching this from a textbook.',
        ctaLabel: '',
        ctaHref: '',
        ctaMicro: '',
        people: [
          {
            label: '',
            name: 'David Love',
            title: 'E-commerce founder, operator and growth strategist',
            monogram: 'DL',
            body: 'I have built e-commerce businesses and operated them — the inventory calls, the margins, the hiring, the months where the plan did not work. I have sold one. I am a co-owner of Tiny 3D Temples and a partner in Come Follow Me FHE.\n\nAlongside that I work as a marketing strategist across multiple Shopify brands, on Meta advertising, email and SMS, offers and conversion.\n\nThat combination is the whole point. Plenty of people can tell you what a good ad looks like. Fewer have had to decide whether to run the promotion when the inventory is already paid for.',
          },
        ],
      },
    },
    {
      type: 'FitLists',
      props: {
        id: 'wk-fit-13',
        show: true,
        eyebrow: 'Fit',
        forHeading: 'This is probably for you if…',
        forItems: [
          { text: 'You own or lead an e-commerce business.' },
          { text: 'You’re serious about growing it.' },
          { text: 'You have more marketing questions than time.' },
          { text: 'You’re tired of guessing what to work on.' },
          { text: 'You want experienced feedback without hiring a full agency.' },
          { text: 'You want to learn alongside other LDS e-commerce founders.' },
        ],
        notHeading: 'Probably not for you if…',
        notItems: [
          { text: 'You’re looking for someone to run your entire business for you.' },
          { text: 'You want overnight results without implementing anything.' },
          { text: 'You’re looking primarily for a beginner Shopify course.' },
        ],
      },
    },
    {
      type: 'DarkCard',
      props: {
        id: 'wk-faith-14',
        show: true,
        eyebrow: 'The room',
        heading: 'Built for LDS e-commerce founders.',
        body: 'Business is only one part of life. This is a community of founders who understand that we’re trying to build profitable companies while also making room for family, faith, service and everything else that matters.',
        kicker: 'You don’t have to explain those priorities here. We already get it.',
      },
    },
    pricing('wk-price-15', [
      { text: 'One live group strategy call every week' },
      { text: 'Bring your store, your numbers and your actual question' },
      { text: 'Feedback on ads, email, offers, promotions and your website' },
      { text: 'Learn from the questions other founders bring' },
      { text: 'Community access between calls' },
    ]),
    {
      type: 'Faq',
      props: {
        id: 'wk-faq-16',
        show: true,
        eyebrow: 'Questions',
        heading: 'Before you join.',
        items: FAQ_FULL,
      },
    },
    /**
     * The last thing before the button is somebody else's words, not ours.
     *
     * It also fixes the rhythm: this used to sit against the founder bio, which
     * put three off-white bands in a row and made the middle of the page read as
     * one long undifferentiated stretch.
     */
    testimonials('wk-quotes-16b', {
      eyebrow: 'In their words',
      heading: 'Founders who have worked with me.',
      items: [MITCH],
    }),
    {
      type: 'CtaCard',
      props: {
        id: 'wk-final-17',
        show: true,
        eyebrow: WEEKLY_NAME,
        heading: 'Stop guessing alone.',
        body: 'Bring the question. Bring the numbers. Bring the store.\n\nWe’ll figure out what deserves your attention next.',
        ctaLabel: WEEKLY_CTA_PRICED,
        ctaHref: JOIN_ANCHOR,
        note: WEEKLY_TERMS,
      },
    },
    footer('wk-footer-18'),
  ],
}

/** Where each page lives, for the seeding migration and the routes. */
export const WEEKLY_PAGES = [
  {
    slug: 'join',
    path: JOIN_PATH,
    title: 'Join',
    description: `${WEEKLY_TITLE}. Weekly group coaching for LDS e-commerce founders. ${WEEKLY_PRICE}${WEEKLY_INTERVAL}, cancel anytime.`,
    content: JOIN_PAGE,
  },
  {
    slug: 'weekly',
    path: '/weekly',
    title: 'eCommHarvest Weekly',
    description: `${WEEKLY_TITLE}. Weekly e-commerce coaching for LDS founders — ads, email, offers, conversion and what to work on next. ${WEEKLY_PRICE}${WEEKLY_INTERVAL}, cancel anytime.`,
    content: WEEKLY_PAGE,
  },
]
