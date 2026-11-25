import { WEEKLY_PATH, WEEKLY_PRICE_LINE } from '@/lib/weekly'

/**
 * `/youtube`: the page that gathers the channel's videos on the site.
 *
 * **Nothing here is invented.** There is no channel address and no video yet, so
 * the subscribe button has no link (a button with a label and no link renders
 * nothing) and the video list is empty (an empty list publishes nothing). Paste
 * the channel link into the hero button and a YouTube link per video in the
 * builder and each appears. The three cards describe what the weekly calls
 * already cover.
 *
 * Pointed at `/weekly` because that is what a viewer who wants more should do
 * next; the price comes from `src/lib/weekly.ts`, as on every page that mentions it.
 */
export const YOUTUBE_PAGE = {
  root: {},
  content: [
    {
      type: 'Header',
      props: {
        id: 'youtube-header-0',
        logoText: 'eCommHarvest',
        homeUrl: 'https://ecommharvest.com/',
        rightText: '',
        showMenu: true,
      },
    },
    {
      type: 'Hero',
      props: {
        id: 'youtube-hero-1',
        eyebrow: 'eCommHarvest on YouTube',
        heading: 'Practical e-commerce marketing, shown on real stores.',
        deck: 'Ads, email, offers, conversion and website changes, explained with real examples from founders who run their own stores.',
        body: '',
        when: '',
        /** Appears when the channel link is pasted. */
        ctaLabel: 'Subscribe on YouTube',
        ctaHref: '',
        ctaMicro: '',
        linkLabel: '',
        linkHref: '',
        image: undefined,
      },
    },
    {
      type: 'VideoGallery',
      props: { id: 'youtube-videos-2', show: true, eyebrow: 'Latest videos', heading: 'Start here.', body: '', items: [] },
    },
    {
      type: 'CardRow',
      props: {
        id: 'youtube-topics-3',
        show: true,
        background: 'white',
        eyebrow: 'What you’ll find here',
        heading: 'Real stores, real numbers, real changes.',
        body: '',
        cards: [
          { title: 'Ads and email', body: 'What to run, what to change, and what to stop.' },
          {
            title: 'Website changes with AI',
            body: 'How Claude, Chrome and Shopify connectors can make and test changes to a store.',
          },
          { title: 'The numbers behind it', body: 'What moved and what did not, with the data on screen.' },
        ],
      },
    },
    {
      type: 'CtaCard',
      props: {
        id: 'youtube-cta-4',
        show: true,
        eyebrow: 'eCommHarvest Weekly',
        heading: 'Want help applying it to your store?',
        body: 'Weekly group coaching for LDS e-commerce founders who want experienced help deciding what to do next.',
        ctaLabel: 'See eCommHarvest Weekly',
        ctaHref: WEEKLY_PATH,
        note: `${WEEKLY_PRICE_LINE} · Cancel anytime`,
      },
    },
    {
      type: 'Footer',
      props: {
        id: 'youtube-footer-5',
        copyright: '© 2026 eCommHarvest',
        links: [
          { label: 'Privacy Policy', href: '/privacy' },
          { label: 'Terms & Conditions', href: '/terms' },
        ],
        note: 'eCommHarvest is a trading name of Love Your Marketing LLC.',
      },
    },
  ],
}

export const YOUTUBE_PAGES = [
  {
    slug: 'youtube',
    path: '/youtube',
    title: 'YouTube',
    seoTitle: 'eCommHarvest on YouTube',
    description:
      'Practical e-commerce marketing shown on real stores: ads, email, offers, conversion and website changes with AI.',
    content: YOUTUBE_PAGE,
  },
]

