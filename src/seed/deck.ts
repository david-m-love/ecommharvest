/**
 * The masterclass deck, as page-builder content.
 *
 * Eighteen slides, each one a block with its props — the same shape the builder
 * saves. It is used twice, and that is the point of it existing:
 *
 *   - the migration seeds the `masterclass-slides` page with it, so the deck
 *     arrives in the builder ready to edit rather than as an empty canvas;
 *   - `/masterclass/slides` falls back to it if that page record is missing,
 *     so the deck still presents during the window between a deploy and its
 *     migration, or if somebody deletes the record an hour before going live.
 *
 * Once the page exists, **this file is no longer what gets presented** — the
 * database is. Editing here changes what a fresh install gets, not what is on
 * the screen tonight; for that, open the deck in the builder.
 *
 * Deliberately free of imports: a migration runs this in plain Node, where a
 * stylesheet or a React component would fail to load.
 *
 * Two conventions in the text below, both of which the builder shows as you
 * type them: `*between asterisks*` is gold, and a new line breaks a closing
 * line in two. In a menu, a tile whose line starts with `*` carries the gold.
 */

export type DeckBlock = { type: string; props: Record<string, unknown> }

/** Puck needs a stable id per block; readable ones make the JSON diffable. */
const slide = (type: string, id: string, props: Record<string, unknown>): DeckBlock => ({
  type,
  props: { id: `deck-${id}`, ...props },
})

export const DECK_BLOCKS: DeckBlock[] = [
  /* ---- 1 ---------------------------------------------------------------- */
  slide('TitleSlide', 'title', {
    name: 'Your Q4 Profit Playbook',
    tone: 'cream',
    eyebrow: 'FREE LIVE MASTERCLASS',
    headline: 'Your Q4 Profit Playbook',
    supporting: 'A working session for building a more profitable Q4.',
    hostsLabel: 'HOSTED BY',
    hostsNames: 'David Love + Derek Crimmin',
  }),

  /* ---- 2 ----------------------------------------------------------------
     The promise, and what "done" looks like. Six outcomes across two lines
     rather than six bullets down the slide. */
  slide('StatsSlide', 'today', {
    name: 'What We’re Doing Today',
    tone: 'light',
    headline: 'Turning Q4 From Ideas Into Decisions',
    headlineSize: 'medium',
    stats: [
      { number: '60', unit: 'MINUTES', says: 'to make the decisions.' },
      { number: '30', unit: 'MINUTES', says: 'to answer your questions.' },
    ],
    itemsTitle: 'BY THE END YOU WILL HAVE CLARITY ON',
    items:
      'What you’re selling\nWhat you still need to test\nWhat your economics allow\nWhich offers deserve consideration\nYour major Q4 windows\nWhat to build next',
    foot: 'You don’t need to finish every detail today.\n*You need to leave knowing what to do next.*',
  }),

  /* ---- 3 ---------------------------------------------------------------- */
  slide('ColumnsSlide', 'growth', {
    name: 'There Are Only 3 Ways a Store Grows',
    tone: 'cream',
    eyebrow: 'THE GROWTH EQUATION',
    headline: 'There Are Only 3 Ways an Ecommerce Store Grows.',
    headlineSize: 'large',
    style: 'cards',
    columns: [
      { number: '01', title: 'MORE CUSTOMERS', body: 'Acquire more buyers.' },
      { number: '02', title: 'BIGGER ORDERS', body: 'Increase average order value.' },
      { number: '03', title: 'MORE PURCHASES', body: 'Get customers to buy again.' },
    ],
    foot: 'Every Q4 tactic should pull *one or more of these levers*.',
  }),

  /* ---- 4 ----------------------------------------------------------------
     The framework, operational: each term is a question, with the things it
     actually covers on one line underneath. */
  slide('EquationSlide', 'framework', {
    name: 'How Do We Pull Those Levers?',
    tone: 'dark',
    eyebrow: 'THE eCommHarvest FRAMEWORK',
    headline: 'How Do We Pull Those Levers?',
    headlineSize: 'large',
    terms: [{ term: 'GOOD SOIL' }, { term: 'GOOD SEED' }, { term: 'CONSISTENT NURTURE' }],
    labels: [
      {
        title: 'GOOD SOIL',
        body: 'Will the store convert the attention?',
        items:
          'Product people want\nValue proposition\nProduct page\nReviews\nOffer\nConversion\nAOV / upsells',
      },
      {
        title: 'GOOD SEED',
        body: 'Are we creating the right attention?',
        items: 'Audience\nMessage\nCreative\nTraffic\nList growth',
      },
      {
        title: 'CONSISTENT NURTURE',
        body: 'What happens after they raise their hand?',
        items:
          'Welcome\nAbandonment\nCampaigns\nLaunches\nPost-purchase\nRepeat purchase',
      },
    ],
    foot: 'Growth gets easier to understand when you stop treating marketing like *a collection of tricks*.',
  }),

  /* ---- 5 ----------------------------------------------------------------
     Evidence before ideas. The prompts are the ones the workbook opens with. */
  slide('FieldsSlide', 'evidence', {
    name: 'Start With What You Already Know',
    tone: 'light',
    eyebrow: 'Q4 PLANNING SHOULD START WITH EVIDENCE, NOT IDEAS.',
    headline: 'Start With What You Already Know',
    headlineSize: 'large',
    cue: 'EXAMPLE: Historical sales / planning view',
    questions:
      'What sold last year?\nWhat are your bestsellers now?\nWhat do customers say they love?\nWhat promotion worked best?\nWhen did demand peak?\nWhat still needs to be tested?',
  }),

  /* ---- 6 ----------------------------------------------------------------
     The readiness audit, as leaks rather than categories — and still grouped by
     soil, seed and nurture, so it reads as the slide before it applied. */
  slide('ColumnsSlide', 'leaks', {
    name: 'Where Are You Leaking Opportunity?',
    tone: 'light',
    headline: 'Where Are You Leaking Opportunity?',
    headlineSize: 'large',
    style: 'cards',
    cue: 'EXAMPLE: One-click upsell / reviews',
    columns: [
      {
        title: 'GOOD SOIL',
        items: 'Weak product page\nNo review system\nNo AOV strategy',
      },
      { title: 'GOOD SEED', items: 'Little customer research\nNo lead capture' },
      {
        title: 'CONSISTENT NURTURE',
        items: 'Welcome flow outdated\nAbandoned cart not tested\nNo Q4 campaign calendar',
      },
    ],
    foot: 'Anything RED becomes urgent pre-Q4 work.',
    footRed: true,
    workbook: 'Q4 Readiness Audit',
  }),

  /* ---- 7 ---------------------------------------------------------------- */
  slide('StackSlide', 'economics', {
    name: 'Know Your Unit Economics',
    tone: 'cream',
    eyebrow: 'KNOW YOUR UNIT ECONOMICS',
    headline: 'How Much Can You Afford to Pay for a Customer?',
    headlineSize: 'small',
    rows: [
      { operator: '', term: 'AVERAGE ORDER VALUE', emphasis: 'none' },
      { operator: '−', term: 'PRODUCT / COGS', emphasis: 'none' },
      { operator: '−', term: 'FULFILLMENT + PACKAGING', emphasis: 'none' },
      { operator: '−', term: 'SHIPPING ABSORBED', emphasis: 'none' },
      { operator: '−', term: 'PAYMENT PROCESSING', emphasis: 'none' },
      { operator: '−', term: 'OTHER VARIABLE COSTS', emphasis: 'none' },
      { operator: '=', term: 'CONTRIBUTION BEFORE ADVERTISING', emphasis: 'subtotal' },
      { operator: '=', term: 'BREAK-EVEN ALLOWABLE CAC', emphasis: 'answer' },
    ],
  }),

  /* ---- 8 ----------------------------------------------------------------
     The same sum with real numbers in it, carried one step further: break-even
     is what you *can* spend, target is what you *choose* to. */
  slide('StackSlide', 'targetcac', {
    name: 'Break-Even CAC ≠ Target CAC',
    tone: 'dark',
    headline: 'Break-Even CAC ≠ Target CAC',
    headlineSize: 'large',
    rows: [
      { operator: '', term: 'Average order', value: '$100', emphasis: 'none' },
      { operator: '−', term: 'Product / COGS', value: '$30', emphasis: 'none' },
      { operator: '−', term: 'Fulfillment, shipping, processing', value: '$13', emphasis: 'none' },
      { operator: '=', term: 'BREAK-EVEN CAC', value: '$57', emphasis: 'subtotal' },
      { operator: '−', term: 'Desired first-order profit', value: '$20', emphasis: 'none' },
      { operator: '=', term: 'TARGET CAC', value: '$37', emphasis: 'answer' },
    ],
    foot: 'Target CAC is a goal, not a guarantee.',
  }),

  /* ---- 9 ---------------------------------------------------------------- */
  slide('CurvesSlide', 'demand', {
    name: 'When Does YOUR Customer Want to Buy?',
    tone: 'light',
    eyebrow: 'YOUR Q4 CUSTOMER',
    headline: 'When Does YOUR Customer Actually Want to Buy?',
    headlineSize: 'small',
    cards: [
      { shape: 'gift', title: 'GIFT-DRIVEN', body: 'Peaks around gifting and Black Friday.' },
      { shape: 'self', title: 'SELF-PURCHASE', body: 'Can rebound after Christmas.' },
      { shape: 'deadline', title: 'OCCASION / DEADLINE', body: 'Peaks at shipping deadlines.' },
      { shape: 'rising', title: 'MIXED', body: 'More than one of these at once.' },
    ],
    foot: 'Your calendar should follow *your buyer*.',
    caption: 'Illustrative patterns, not forecasts.',
    workbook: 'Identify Your Q4 Demand Pattern',
  }),

  /* ---- 10 ---------------------------------------------------------------- */
  slide('ColumnsSlide', 'spotlight', {
    name: 'Decide What Deserves the Spotlight',
    tone: 'wash',
    headline: 'Decide What Deserves the Spotlight',
    headlineSize: 'large',
    style: 'pillars',
    cue: 'EXAMPLE: Come Follow Me FHE product testing',
    columns: [
      { number: '01', title: 'PROVEN WINNERS' },
      { number: '02', title: 'GIFTABLE PRODUCTS' },
      { number: '03', title: 'NEW PRODUCTS' },
      { number: '04', title: 'HIGH-MARGIN PRODUCTS' },
      { number: '05', title: 'PRODUCTS TO TEST' },
    ],
    foot: 'You do not need every Black Friday decision today.\n*You do need to know what you are testing now.*',
  }),

  /* ---- 11 ----------------------------------------------------------------
     Behaviour first, mechanism second — which is the whole argument of the
     slide, so the two columns are in that order. */
  slide('ColumnsSlide', 'offers', {
    name: 'Don’t Start With the Discount',
    tone: 'light',
    eyebrow: 'DON’T START WITH THE DISCOUNT. START WITH THE BEHAVIOR.',
    headline: 'What Do You Want the Customer to Do?',
    headlineSize: 'medium',
    style: 'cards',
    cue: 'EXAMPLE: B.O.M.Socks threshold offer / bundles',
    columns: [
      {
        number: '01',
        title: 'THE BEHAVIOR',
        items: 'Buy now\nSpend more\nBuy multiple items\nTry a new product\nBuy a gift\nBuy again',
        accent: true,
      },
      {
        number: '02',
        title: 'THE MECHANISM THAT SUPPORTS IT',
        items:
          'Bundle\nSpend threshold\nGift with purchase\nTiered discount\nVIP access\nBOGO\nLimited edition\nFree shipping',
      },
    ],
    foot: 'Pick the behavior first. *The discount is the last decision, not the first.*',
  }),

  /* ---- 12 ---------------------------------------------------------------- */
  slide('TimelineSlide', 'calendar', {
    name: 'Q4 Is a Series of Buying Windows',
    tone: 'light',
    eyebrow: 'YOUR Q4 CALENDAR',
    headline: 'Q4 Is a Series of Buying Windows.',
    headlineSize: 'large',
    stops: [
      { label: 'PREPARE + GROW THE LIST', when: 'SEPT–OCT' },
      { label: 'EARLY Q4', when: 'OCT–EARLY NOV' },
      { label: 'EARLY BLACK FRIDAY / VIP', when: 'MID NOV' },
      { label: 'BLACK FRIDAY + CYBER WEEKEND', when: 'LATE NOV' },
      { label: 'GIFTING', when: 'EARLY DEC' },
      { label: 'SHIPPING DEADLINE', when: 'MID DEC' },
      { label: 'POST-CHRISTMAS + NEW YEAR', when: 'DEC 26–JAN' },
    ],
    foot: 'Not every brand needs every window.\n*Your job is to decide which ones belong in YOUR plan.*',
  }),

  /* ---- 13 ----------------------------------------------------------------
     The one idea that decides what this week is for. */
  slide('ColumnsSlide', 'testamplify', {
    name: 'Now = Test. Black Friday = Amplify.',
    tone: 'dark',
    headline: 'Now = Test. Black Friday = Amplify.',
    headlineSize: 'large',
    style: 'cards',
    columns: [
      {
        number: 'NOW',
        title: 'TEST',
        items: 'Products\nOffers\nMessages\nCreative',
        accent: true,
      },
      {
        number: 'BLACK FRIDAY',
        title: 'AMPLIFY',
        body: 'What has already shown evidence of working.',
      },
    ],
    foot: 'The goal is not to guess better on Black Friday.\n*It’s to learn enough before it that you don’t have to guess.*',
  }),

  /* ---- 14 ---------------------------------------------------------------- */
  slide('FieldsSlide', 'windows', {
    name: 'Build Each Window',
    tone: 'light',
    note: 'The hand-off slide — screen-share the workbook here.',
    headline: 'Build Each Window',
    headlineSize: 'large',
    cue: 'EXAMPLE: Q4 planning calendar / Asana view',
    questions:
      'WHAT ARE WE SELLING?\nWHO IS IT FOR?\nWHAT IS THE OFFER?\nEMAIL / SMS\nTRAFFIC / CREATIVE\nSITE CHANGES',
    workbook: 'This is where your Q4 calendar starts taking shape.',
  }),

  /* ---- 15 ---------------------------------------------------------------- */
  slide('FlowSlide', 'campaign', {
    name: 'Don’t Send One Email. Build a Campaign.',
    tone: 'dark',
    eyebrow: 'CONSISTENT NURTURE',
    headline: 'Don’t Send One Email. Build a Campaign.',
    headlineSize: 'large',
    cue: 'EXAMPLE: Come Follow Me FHE launch sequence',
    steps: 'TEASE\nCAPTURE\nREVEAL\nLAUNCH\nEXPLAIN / PROOF\nREMINDER\nURGENCY',
    caption: 'EMAIL + SMS',
    foot: 'Another email doesn’t mean saying the same thing again.\n*Each message gives the customer another reason to care.*',
  }),

  /* ---- 16 ----------------------------------------------------------------
     One slide, and then Derek speaks. Nothing here scripts him. */
  slide('ImageSlide', 'founder', {
    name: 'The Business Isn’t the Only Thing You’re Building',
    tone: 'dark',
    note: 'Derek speaks freely from here. Portrait still a placeholder.',
    layout: 'split',
    eyebrow: 'THE FOUNDER',
    headline: 'The Business Isn’t the Only Thing You’re Building.',
    headlineSize: 'large',
    lede: 'A founder’s capacity matters too.',
    speakerLabel: 'SPEAKER',
    speakerName: 'Derek  |  B.O.M.Socks',
    imageLabel: '[DEREK VISUAL PLACEHOLDER]',
  }),

  /* ---- 17 ---------------------------------------------------------------- */
  slide('ColumnsSlide', 'next90', {
    name: 'Your Next 90 Minutes',
    tone: 'wash',
    eyebrow: 'DON’T JUST TAKE NOTES',
    headline: 'Your Next 90 Minutes',
    headlineSize: 'large',
    style: 'cards',
    columns: [
      { number: '01', title: 'FINISH', body: 'Decisions you started today.', accent: true },
      { number: '02', title: 'BUILD', body: 'Assets and systems Q4 requires.' },
      { number: '03', title: 'ASSIGN', body: 'Who owns each next step, and by when?' },
    ],
    foot: 'Do not leave today with notes.\n*Leave with assignments.*',
    workbook: 'Final Action Plan',
  }),

  /* ---- 18 ---------------------------------------------------------------- */
  slide('ChipsSlide', 'qa', {
    name: 'What Are You Stuck On?',
    tone: 'dark',
    headline: 'What Are You Stuck On?',
    headlineSize: 'large',
    subhead: 'Live Q&A with David + Derek',
    chips: 'ADS\nEMAIL / SMS\nCREATIVE\nOFFERS\nCONVERSION\nPROFITABILITY\nPLANNING\nANYTHING Q4',
    foot: 'Ask the question that’s *actually keeping you stuck*.',
  }),
]

/** The whole deck, in the shape the `pages.content` column stores. */
export const DECK_PAGE = { root: {}, content: DECK_BLOCKS }

export const DECK_SLUG = 'masterclass-slides'
