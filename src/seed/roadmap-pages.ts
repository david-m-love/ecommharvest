import {
  PLACEHOLDERS,
  ROADMAP_CHECKOUT_MISSING,
  ROADMAP_CHECKOUT_URL,
  ROADMAP_CTA,
  ROADMAP_NAME,
  ROADMAP_PATH,
  ROADMAP_PREVIEW_PATH,
  ROADMAP_PRICE,
  ROADMAP_THANKS_PATH,
  ROADMAP_TRACK_AS,
} from '@/lib/roadmap'

/**
 * The Founder Roadmap pages: `/roadmap`, `/roadmap/preview` and `/roadmap/thanks`.
 *
 * Written from "Founder Roadmap Sales Pages: Copy Deck v2". The copy is the
 * deck's, word for word; this file only decides which block carries which part.
 *
 * **Nothing is invented.** The deck's rule is "never invent a testimonial, a
 * number, or a logo", so every proof slot (testimonials, client logos, the
 * sample pictures, the photos) is an empty array and publishes nothing until
 * somebody uploads the real thing. The four decisions David has not made stay
 * as their own square-bracket tokens; see `findPlaceholders` in
 * `src/lib/roadmap.ts`.
 *
 * **No em dashes**, in body copy, alt text or meta tags. A test enforces it.
 *
 * Both sales pages read the price and the button text from `src/lib/roadmap.ts`.
 * Every button above the price scrolls to it (`#join`), so the checkout link
 * lives in exactly one field per page.
 */

const P = PLACEHOLDERS

const JOIN_ANCHOR = '#join'

/** No menu: a page with one decision should not offer five other ones. */
const header = (id: string) => ({
  type: 'Header',
  props: {
    id,
    logoText: 'eCommHarvest',
    homeUrl: 'https://ecommharvest.com/',
    rightText: `${ROADMAP_NAME} · ${ROADMAP_PRICE}`,
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

const KICKER = 'The Founder Roadmap · A personalized 90-day growth plan'
const HEADLINE = 'You don’t need more ideas. You need the right order.'

const cards = (id: string, props: Record<string, unknown>) => ({
  type: 'CardRow',
  props: { id, show: true, background: 'wash', eyebrow: '', heading: '', body: '', cards: [], ...props },
})

const prose = (id: string, props: Record<string, unknown>) => ({
  type: 'Prose',
  props: { id, eyebrow: '', heading: '', body: '', background: 'white', ...props },
})

/** Empty until somebody supplies a quote and written permission. */
const testimonials = (id: string, heading = '') => ({
  type: 'Testimonials',
  props: { id, show: true, eyebrow: '', heading, items: [] },
})

const david = (id: string, body: string) => ({
  type: 'Speakers',
  props: {
    id,
    show: true,
    eyebrow: '',
    heading: 'From one founder to another',
    ctaLabel: '',
    ctaHref: '',
    ctaMicro: '',
    people: [{ label: '', name: 'David Love', title: 'Founder, eCommHarvest', monogram: 'DL', body }],
  },
})

const pricing = (id: string, props: Record<string, unknown>) => ({
  type: 'PricingCard',
  props: {
    id,
    show: true,
    eyebrow: ROADMAP_NAME,
    name: '',
    price: ROADMAP_PRICE,
    interval: '',
    compareAt: '',
    body: 'One flat fee. No ongoing commitment, no agency retainer, and no surprise pitch on your delivery call.',
    benefits: [],
    ctaLabel: ROADMAP_CTA,
    checkoutUrl: ROADMAP_CHECKOUT_URL,
    terms: '',
    risk: '',
    founding: '',
    cap: '',
    urgency: '',
    unavailable: ROADMAP_CHECKOUT_MISSING,
    trackAs: ROADMAP_TRACK_AS,
    linkLabel: '',
    linkHref: '',
    ...props,
  },
})

// --- /roadmap: the short page ---------------------------------------------

export const ROADMAP_PAGE = {
  root: {},
  content: [
    header('roadmap-header-0'),
    {
      type: 'Hero',
      props: {
        id: 'roadmap-hero-1',
        eyebrow: KICKER,
        heading: HEADLINE,
        deck: 'Find out what’s holding your store back, what to work on first, and what can wait. Built from your real store numbers, not someone else’s playbook.',
        body: '',
        when: '',
        ctaLabel: ROADMAP_CTA,
        ctaHref: JOIN_ANCHOR,
        ctaMicro:
          'Two 60-minute calls. A written plan you keep. Your first month of the weekly founder class. No retainer.',
        linkLabel: '',
        linkHref: '',
        /** The mockup: cover and two inside pages from the Hollow Pine Co. sample. Upload in the builder. */
        image: undefined,
      },
    },
    cards('roadmap-questions-2', {
      eyebrow: 'The decisions that matter',
      heading: 'Three questions. Clear answers.',
      cards: [
        { title: 'Should I be running ads?', body: 'You’ll get a yes or a not yet, with the math behind it.' },
        {
          title: 'What’s holding my store back right now?',
          body: 'Your highest-priority constraint, named, with the evidence.',
        },
        {
          title: 'What do I do on Monday?',
          body: 'Ninety days, in order, sized to the hours you actually have.',
        },
      ],
    }),
    {
      type: 'BulletList',
      props: {
        id: 'roadmap-included-3',
        show: true,
        eyebrow: '',
        heading: `What your ${ROADMAP_PRICE} includes`,
        leadIn: '',
        bullets: [
          {
            lead: 'A 60-minute listening call.',
            text: 'I’ve already looked at your site and your data. You talk, I ask the numbers questions.',
          },
          {
            lead: 'Your written Roadmap.',
            text: 'The math, where you stand, what’s already working, your highest-priority constraint, and the next ninety days in order.',
          },
          { lead: 'A numbers workbook.', text: 'Change an assumption and watch the plan move.' },
          {
            lead: 'A 60-minute delivery call.',
            text: 'We walk the plan and your first two weeks together.',
          },
          {
            lead: 'Your first month of the weekly founder class.',
            text: `${P.classTime}, live Q&A and a store hot seat. ${P.classTerms}`,
          },
          {
            lead: 'A list of what not to spend money on yet.',
            text: 'That includes things I sell.',
          },
        ],
        ctaLabel: '',
        ctaHref: '',
        ctaMicro: '',
      },
    },
    cards('roadmap-how-4', {
      background: 'white',
      heading: 'How it works',
      cards: [
        {
          title: '1. Checkout and a short questionnaire',
          body: 'About 15 minutes. Share read-only access, or send exports if you’d rather.',
        },
        {
          title: '2. Listening call',
          body: 'One hour. You won’t be asked anything I could have found myself.',
        },
        {
          title: '3. Your Roadmap and the delivery call',
          body: `The written plan arrives ${P.turnaround}. Read it first, then we walk it together.`,
        },
      ],
    }),
    david(
      'roadmap-about-5',
      'I’m David Love. I don’t just advise stores, I run them. I operate and market Tiny 3D Temples and Mountain Top Creations, and through Love Marketing I work inside Meta ad accounts, email platforms, and Shopify stores for founder-led brands every week.\n\nI’ve made the expensive mistakes myself: ads before the margins were ready, flows built before the store converted. The Roadmap is the plan I wish I’d had before each of those.',
    ),
    testimonials('roadmap-quote-6'),
    pricing('roadmap-price-7', {
      terms:
        'Built for founders with real sales, under $1M a year, and at least five hours a week to put in. If it isn’t a fit, I’ll tell you on the first call.',
      linkLabel: 'Want to see sample pages first? Read the full preview →',
      linkHref: ROADMAP_PREVIEW_PATH,
    }),
    footer('roadmap-footer-8'),
  ],
}

// --- /roadmap/preview: the long page ---------------------------------------

const TEN_SECTIONS = [
  {
    title: 'Where you stand',
    items: [
      { number: '01', title: 'The math', text: 'What’s left after costs on an average order, and whether ads can work yet.' },
      { number: '02', title: 'Where you are', text: 'Which of four stages your store is in, and what moving up looks like.' },
      { number: '03', title: 'What’s already working', text: 'The strengths to protect.' },
      { number: '04', title: 'The constraint', text: 'Your highest-priority constraint right now, scored with evidence.' },
    ],
  },
  {
    title: 'What to do',
    items: [
      { number: '05', title: 'The lever scorecard', text: 'What each growth lever is worth on your store, with confidence levels.' },
      { number: '06', title: 'Your next ninety days', text: 'In order, sized to your hours, plus what not to spend on yet.' },
      { number: '07', title: 'The seasonal calendar', text: 'Dated buying windows for your customer.' },
      { number: '08', title: 'Site and conversion fixes', text: 'Ranked by what they’re worth, not how easy they are.' },
    ],
  },
  {
    title: 'What’s next',
    items: [
      { number: '09', title: 'What we see that you didn’t ask about', text: 'Usually the most valuable page.' },
      { number: '10', title: 'What comes after', text: 'The next stage, what triggers it, and what to leave alone until then.' },
    ],
  },
]

const FAQ = [
  {
    q: 'How do I know if the Roadmap is right for my business?',
    a: 'It’s built for founders who already have sales, have real questions about where to put their next dollar and hour, and are ready to act on a plan. If you’re not sure, reply to my email or book a short call and I’ll tell you honestly. If it isn’t a fit, I’ll point you somewhere better.',
  },
  {
    q: 'Do I have to give you access to my store?',
    a: 'Read-only access gives you the most accurate Roadmap and saves you work. If you’d rather not, exports work. I never change anything in your store or accounts.',
  },
  {
    q: 'What platforms do you work with?',
    a: 'Mostly Shopify. Wix and other platforms work too, as long as I can see your sales data.',
  },
  {
    q: 'How long until I get it?',
    a: `${P.turnaround}. I limit how many Roadmaps are in progress at once so that stays true.`,
  },
  { q: 'What happens with the founder class after the first month?', a: P.classTerms },
  {
    q: 'Will you try to sell me something on the delivery call?',
    a: 'No. The Roadmap is written so you can run it yourself. If the math later says execution help makes sense, I’ll say so then, with the numbers.',
  },
  {
    q: 'Will it tell me whether to run ads?',
    a: 'Yes. You’ll get a clear yes or not yet, the math behind it, and what would change the answer.',
  },
  {
    q: 'I sell more than one kind of product. Which should I focus on?',
    a: 'That’s what the constraint and lever sections are for. The Roadmap tells you where to put your hours first, and why.',
  },
]

export const PREVIEW_PAGE = {
  root: {},
  content: [
    header('preview-header-0'),
    {
      type: 'Hero',
      props: {
        id: 'preview-hero-1',
        eyebrow: KICKER,
        heading: HEADLINE,
        deck: 'A written growth plan built from your real store numbers. It tells you what’s holding your store back, what to prioritize, and what can wait. Here’s exactly what’s inside.',
        body: '',
        when: '',
        ctaLabel: ROADMAP_CTA,
        ctaHref: JOIN_ANCHOR,
        ctaMicro: 'Two 60-minute calls. A written plan you keep. No retainer.',
        linkLabel: 'See sample pages ↓',
        linkHref: '#sample-pages',
        image: undefined,
      },
    },
    {
      type: 'SampleGallery',
      props: {
        id: 'preview-samples-2',
        show: true,
        eyebrow: 'See it before you buy it',
        heading: 'This is what a Roadmap looks like.',
        body: 'These pages come from a sample Roadmap for Hollow Pine Co., a made-up brand built to look like the founders I work with. The numbers are invented. The method is real.',
        items: [
          { image: undefined, caption: 'What’s left on every order, and the most you can pay for a customer.' },
          { image: undefined, caption: 'Your highest-priority constraint, scored with evidence.' },
          { image: undefined, caption: 'What each growth lever is worth on your store, in dollars.' },
          { image: undefined, caption: 'In order, with a do-not-spend-yet list.' },
          { image: undefined, caption: 'Dated buying windows for your customer.' },
        ],
        note: 'Every number in a real Roadmap is tagged as a fact, an inference from your data, or an estimate with a confidence level. You’ll never have to guess which is which.',
      },
    },
    prose('preview-letter-3', {
      eyebrow: 'A note before you read',
      heading: 'You can do anything. You can’t do everything.',
      body:
        'If you run a store, the problem isn’t a shortage of ideas. It’s the opposite. Every week brings another tactic and another person telling you the one thing you’re missing. All of it works for someone. Almost none of it works out of order.\n\n' +
        'The founders who grow aren’t the ones who try the most things. They do the right things in the right order for the stage they’re actually in. That’s a sequencing problem, and sequencing is what the Roadmap solves.\n\n' +
        'It isn’t an agency pitch. I’ll tell you plainly what I wouldn’t spend money on yet, including things I sell. If the math says you aren’t ready for ads, the Roadmap will say so and tell you what to do instead.\n\n' +
        'David Love, Founder, eCommHarvest',
    }),
    cards('preview-growth-4', {
      heading: 'There are only three ways to grow a store.',
      body: 'Every tactic you’ve been pitched moves one of these numbers, or it moves nothing. Your Roadmap puts a dollar figure on each one for your store, so you know which deserves your hours this quarter.',
      background: 'white',
      cards: [
        { title: 'More customers', body: 'Traffic, conversion, list growth, partnerships.' },
        { title: 'Bigger orders', body: 'Offers, bundles, free-shipping thresholds, upsells.' },
        { title: 'More purchases', body: 'Post-purchase emails, reminders, win-backs.' },
      ],
    }),
    {
      type: 'NumberedGroups',
      props: {
        id: 'preview-ten-5',
        show: true,
        eyebrow: '',
        heading: 'Ten sections, always in the same order.',
        groups: TEN_SECTIONS,
      },
    },
    cards('preview-data-6', {
      heading: 'Your numbers, not your memory.',
      body: 'Most plans are built on what the founder remembers. Yours is built on what your store actually recorded: revenue, orders, average order value, repeat rate, best sellers, email performance, and ad results if you have them.',
      cards: [
        { title: 'Read-only.', body: 'I look, I never change anything in your store or your accounts.' },
        { title: 'Exports work too.', body: 'Rather not share access? Send exports and I’ll build from those.' },
        { title: 'Gaps don’t stall it.', body: P.accessDelay },
      ],
    }),
    {
      /** Two optional pictures: an anonymised analytics screenshot and the workbook. Hidden until uploaded. */
      type: 'SampleGallery',
      props: {
        id: 'preview-data-pictures-7',
        show: true,
        eyebrow: '',
        heading: '',
        body: '',
        items: [
          { image: undefined, caption: 'Store analytics used to build a Roadmap.' },
          { image: undefined, caption: 'The Roadmap workbook showing contribution per order and break-even ad cost.' },
        ],
        note: '',
      },
    },
    cards('preview-how-8', {
      background: 'white',
      heading: 'Two calls, one written plan, and your next ninety days in order.',
      cards: [
        {
          title: '1. Checkout and questionnaire',
          body: 'A short intake on costs, goals, hours, and what you’ve tried, plus read-only access or exports.',
        },
        {
          title: '2. The listening call, 60 minutes',
          body: 'I’ve already pulled your site, pricing, and data. You tell me what you’ve built and where you’re stuck.',
        },
        {
          title: '3. The build and the delivery call, 60 minutes',
          body: `Your written Roadmap arrives ${P.turnaround}. Read it first, then we walk the math, the plan, and your first two weeks.`,
        },
      ],
    }),
    {
      type: 'DarkCard',
      props: {
        id: 'preview-after-9',
        eyebrow: 'After that',
        heading: 'Your first month in the weekly founder class',
        body: `${P.classTime}. Run the plan yourself and bring your questions to the hot seat. ${P.classTerms}`,
        kicker: '',
      },
    },
    david(
      'preview-about-10',
      'I’m David Love, founder of eCommHarvest and Love Marketing. I operate and market my own stores, including Tiny 3D Temples and Mountain Top Creations, and I work inside Meta ad accounts, email platforms, and Shopify stores for founder-led brands every week.\n\nThat matters for your Roadmap. The advice isn’t theory. It’s what I’m doing, testing, and sometimes getting wrong in my own stores. I’ve run ads before the margins were ready. I’ve built email flows before the store converted. The Roadmap is how I help you skip those.\n\nMy position is simple: I take your numbers seriously, and I’ll tell you the truth about them, including when the truth is “not yet.”',
    ),
    {
      /** Brands David operates or has worked with, only ones that approved it. Empty means the row is not published. */
      type: 'LogoTicker',
      props: { id: 'preview-logos-11', show: true, heading: '', logos: [] },
    },
    testimonials('preview-quotes-12', 'What founders say'),
    prose('preview-worth-13', {
      background: 'wash',
      heading: 'What could one better decision be worth?',
      body:
        'A founder could spend another month running ads before finding out the margins don’t support them. Or pay someone to build email flows when the real problem is that visitors aren’t buying in the first place. Or put the whole holiday season behind the wrong product.\n\n' +
        'Each of those costs more than $500, in money or in months.\n\n' +
        'The Roadmap isn’t a guarantee of growth. Nobody honest can give you one. It’s a chance to make your next decisions with better information, in the right order.',
    }),
    {
      type: 'FitLists',
      props: {
        id: 'preview-fit-14',
        show: true,
        eyebrow: 'Who it’s for',
        forHeading: 'Good fit',
        forItems: [
          { text: 'Online store founders with real sales, under $1M a year' },
          { text: 'At least five hours a week to put into the business, and ready to act on a plan' },
          { text: 'Weighing ads, help, or site fixes, and not sure which comes first' },
        ],
        notHeading: 'Not a fit',
        notItems: [
          { text: 'Pre-launch, with no sales yet' },
          { text: 'You want someone to run your ads by Friday' },
          { text: 'You want a guaranteed revenue number' },
        ],
      },
    },
    { type: 'Faq', props: { id: 'preview-faq-15', show: true, eyebrow: '', heading: 'Questions', items: FAQ } },
    pricing('preview-price-16', {
      benefits: [
        { text: '60-minute listening call' },
        { text: 'Written Roadmap, all ten sections, built on your numbers' },
        { text: 'Numbers workbook' },
        { text: '60-minute delivery call' },
        { text: 'First month of the weekly founder class' },
      ],
      risk: 'You can do anything. You can’t do everything. The Roadmap tells you which thing is next, and why.',
    }),
    footer('preview-footer-17'),
  ],
}

// --- /roadmap/thanks: after checkout, shared -------------------------------

export const THANKS_PAGE = {
  root: {},
  content: [
    header('thanks-header-0'),
    {
      type: 'Hero',
      props: {
        id: 'thanks-hero-1',
        eyebrow: ROADMAP_NAME,
        heading: 'You’re in. Here’s what happens next.',
        deck: '',
        body: '',
        when: '',
        /** Button appears when the questionnaire link is pasted. */
        ctaLabel: 'Start the questionnaire',
        ctaHref: '',
        ctaMicro: '',
        linkLabel: '',
        linkHref: '',
        image: undefined,
      },
    },
    {
      type: 'BulletList',
      props: {
        id: 'thanks-steps-2',
        show: true,
        eyebrow: 'Your next three steps',
        heading: '',
        leadIn: '',
        bullets: [
          {
            lead: '1. Fill out the questionnaire.',
            text: 'About 15 minutes. Skip anything you don’t know, because a blank tells me something too.',
          },
          { lead: '2. Book your listening call.', text: '' },
          {
            lead: '3. Share read-only access, or send exports.',
            text: 'Instructions are in your confirmation email.',
          },
        ],
        /** Button appears when the booking link is pasted. */
        ctaLabel: 'Book your listening call',
        ctaHref: '',
        ctaMicro: '',
      },
    },
    prose('thanks-help-3', {
      body: 'Questions? Email david@ecommharvest.com.',
    }),
    footer('thanks-footer-4'),
  ],
}

export const ROADMAP_PAGES = [
  {
    slug: 'roadmap',
    path: ROADMAP_PATH,
    title: 'Founder Roadmap (short)',
    seoTitle: 'The Founder Roadmap | eCommHarvest',
    description:
      'A personalized 90-day growth plan for your store, built from your real numbers. Two calls, a written plan, no retainer. $500.',
    content: ROADMAP_PAGE,
  },
  {
    slug: 'roadmap-preview',
    path: ROADMAP_PREVIEW_PATH,
    title: 'Founder Roadmap (long)',
    seoTitle: 'Inside the Founder Roadmap | eCommHarvest',
    description:
      'See sample pages from a Founder Roadmap: the math, the constraint, the 90-day plan, and the seasonal calendar. Built from your real store numbers. $500.',
    content: PREVIEW_PAGE,
  },
  {
    slug: 'roadmap-thanks',
    path: ROADMAP_THANKS_PATH,
    title: 'Founder Roadmap (after checkout)',
    seoTitle: 'Welcome to the Founder Roadmap | eCommHarvest',
    description: 'What happens next after you buy the Founder Roadmap.',
    content: THANKS_PAGE,
    /** After a purchase, not for search. */
    noindex: true,
  },
]
