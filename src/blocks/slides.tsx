import type { Config, Data, Field } from '@measured/puck'
import React from 'react'

import { imageField } from './image-field'
import {
  renderSlide,
  type ChipsSlideProps,
  type ColumnsSlideProps,
  type CurvesSlideProps,
  type EquationSlideProps,
  type FieldsSlideProps,
  type FlowSlideProps,
  type ImageSlideProps,
  type MenuSlideProps,
  type SlideContext,
  type StackSlideProps,
  type StatsSlideProps,
  type TimelineSlideProps,
  type TitleSlideProps,
} from './slides-render'
import '@/styles/slides.css'

/* ============================================================================
   The slide deck, in the page builder.
   ----------------------------------------------------------------------------
   The same editor as the rest of the site — drag a slide in, reorder by
   dragging, type in the panel on the right, upload a picture without leaving
   the canvas, Save draft, Update live page — with slide layouts in place of
   page sections. `/builder` opens a deck in this config rather than the page
   one, decided by the page's Kind.

   Each layout here is a *shape*, not a single slide: "Row of columns" is slides
   3, 5, 14 and 16 of the masterclass deck with different words in it. That is
   what keeps twelve layouts covering seventeen slides, and what makes an
   eighteenth slide a drag rather than a deploy.

   How it is drawn lives in `slides-render.tsx`, which the live deck uses too,
   so the canvas and the presentation cannot drift apart.
   ========================================================================== */

export type SlideBlocks = {
  TitleSlide: TitleSlideProps
  StatsSlide: StatsSlideProps
  ColumnsSlide: ColumnsSlideProps
  EquationSlide: EquationSlideProps
  StackSlide: StackSlideProps
  CurvesSlide: CurvesSlideProps
  MenuSlide: MenuSlideProps
  TimelineSlide: TimelineSlideProps
  FieldsSlide: FieldsSlideProps
  FlowSlide: FlowSlideProps
  ImageSlide: ImageSlideProps
  ChipsSlide: ChipsSlideProps
}

/**
 * On every slide, and always last in the panel.
 *
 * Last because they are settings rather than content: the words come first,
 * every time, and someone editing a slide in a hurry should not have to scroll
 * past a colour picker to reach the headline.
 */
const common = {
  name: {
    type: 'text',
    label: 'Name in the slide list',
    // Shown in the jump grid while presenting (press G), never on the slide.
  },
  tone: {
    type: 'select',
    label: 'Background',
    options: [
      { label: 'White', value: 'light' },
      { label: 'Cream', value: 'cream' },
      { label: 'Off-white', value: 'wash' },
      { label: 'Navy (reversed)', value: 'dark' },
    ],
  },
  note: {
    type: 'text',
    label: 'Private note',
    // Appears in the builder and the jump grid. Never on the slide itself, so a
    // deck with unfinished slides is still safe to present.
  },
  cue: {
    type: 'text',
    label: 'Presenter cue — e.g. EXAMPLE: Shopify growth view',
    // This one is on the slide, small, beside the brand mark: a reminder to
    // show the real thing here.
  },
} satisfies Record<string, Field>

/**
 * Headline size, chosen rather than measured.
 *
 * A slide is a fixed 16:9 stage and the text has to fit it, but how much room a
 * headline needs depends on the words — "Build Each Window" and "How Much Can
 * You Afford to Pay for a Customer?" are both headlines. Three sizes, and the
 * description says which way to reach when a headline collides with what is
 * under it.
 */
const headlineSize = {
  type: 'select',
  label: 'Headline size',
  options: [
    { label: 'Large', value: 'large' },
    { label: 'Medium', value: 'medium' },
    { label: 'Small — for long headlines', value: 'small' },
  ],
} satisfies Field

/**
 * The closing line.
 *
 * One field, two conventions: a new line breaks the sentence in two, and
 * *asterisks* turn the part between them gold. Both are visible in the canvas
 * as you type them, which is the only reason a convention is acceptable here.
 */
const footFields = {
  foot: {
    type: 'textarea',
    label: 'Closing line — *gold* for emphasis, a new line for a second line',
  },
} satisfies Record<string, Field>

const workbookField = {
  type: 'text',
  label: 'Workbook prompt',
  // Shown as the "WORKBOOK →" chip. Empty means no chip, which is most slides.
} satisfies Field

/** The context a block render can reach — currently just the site logo. */
const contextOf = (puck?: { metadata?: Record<string, unknown> }): SlideContext => ({
  siteLogoUrl: (puck?.metadata?.siteLogoUrl as string | null | undefined) ?? null,
})

/**
 * Draw a slide on the canvas.
 *
 * Every layout below renders through here, so the canvas is running exactly the
 * code the live deck runs. The empty frame is unreachable — `type` is always a
 * layout that exists — but `renderSlide` is written to tolerate a block type it
 * does not know, and Puck wants an element rather than a maybe.
 */
const draw = <T extends keyof SlideBlocks>(
  type: T,
  props: SlideBlocks[T] & { puck?: { metadata?: Record<string, unknown> } },
): React.ReactElement =>
  renderSlide({ type, props: props as Record<string, unknown> }, contextOf(props.puck)) ?? (
    <div className="sl-frame" />
  )

export const slidesConfig: Config<SlideBlocks> = {
  /** No root fields: the deck's name is the page record's, not Puck's. */
  root: { fields: {} },
  categories: {
    'Open and close': {
      title: 'Open and close',
      components: ['TitleSlide', 'ImageSlide', 'ChipsSlide'],
      defaultExpanded: true,
    },
    Teach: {
      title: 'Teach an idea',
      components: ['ColumnsSlide', 'EquationSlide', 'FlowSlide', 'MenuSlide', 'TimelineSlide', 'CurvesSlide'],
      defaultExpanded: true,
    },
    Work: {
      title: 'Numbers and work',
      components: ['StatsSlide', 'StackSlide', 'FieldsSlide'],
      defaultExpanded: true,
    },
  },
  components: {
    /* ---- the opening slide -------------------------------------------- */
    TitleSlide: {
      label: 'Title slide',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        headline: { type: 'textarea', label: 'Headline' },
        supporting: { type: 'textarea', label: 'Supporting line' },
        hostsLabel: { type: 'text', label: 'Small label above the names' },
        hostsNames: { type: 'text', label: 'Names' },
        logo: imageField('Logo', 'Leave empty to use the site logo from Site Styles.'),
        ...common,
      },
      defaultProps: {
        name: 'Title',
        tone: 'cream',
        eyebrow: 'FREE LIVE MASTERCLASS',
        headline: 'Your Q4 Profit Playbook',
        supporting: 'A working session for building a more profitable Q4.',
        hostsLabel: 'HOSTED BY',
        hostsNames: 'David Love + Derek Crimmin',
      },
      render: (props) => draw('TitleSlide', props),
    },

    /* ---- two or three big numbers -------------------------------------- */
    StatsSlide: {
      label: 'Big numbers',
      fields: {
        headline: { type: 'textarea', label: 'Headline' },
        headlineSize,
        stats: {
          type: 'array',
          label: 'Numbers',
          getItemSummary: (item) => `${item?.number ?? ''} ${item?.unit ?? ''}`.trim() || 'Number',
          defaultItemProps: { number: '60', unit: 'MINUTES', says: 'What this time is for.' },
          arrayFields: {
            number: { type: 'text', label: 'Number' },
            unit: { type: 'text', label: 'Unit' },
            says: { type: 'textarea', label: 'What it is for' },
          },
        },
        itemsTitle: { type: 'text', label: 'Small label above the outcomes' },
        items: { type: 'textarea', label: 'Outcomes — one per line' },
        ...footFields,
        image: imageField('Picture', 'Small, beside the closing line. A workbook page, usually.'),
        imageLabel: { type: 'text', label: 'Label while there is no picture' },
        ...common,
      },
      defaultProps: {
        name: 'What we’re doing today',
        tone: 'light',
        headline: 'What We’re Doing Today',
        headlineSize: 'large',
        stats: [
          { number: '60', unit: 'MINUTES', says: 'to make the important decisions.' },
          { number: '30', unit: 'MINUTES', says: 'to help with your questions.' },
        ],
        foot: 'You don’t need to finish every detail today.\n*You need to leave knowing what to do next.*',
        imageLabel: '[IMAGE PLACEHOLDER: WORKBOOK PAGE]',
      },
      render: (props) => draw('StatsSlide', props),
    },

    /* ---- the workhorse: two to five columns ---------------------------- */
    ColumnsSlide: {
      label: 'Row of columns',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        headline: { type: 'textarea', label: 'Headline' },
        headlineSize,
        style: {
          type: 'radio',
          label: 'Style',
          options: [
            { label: 'Cards', value: 'cards' },
            { label: 'Tall pillars', value: 'pillars' },
          ],
        },
        columns: {
          type: 'array',
          label: 'Columns',
          getItemSummary: (item) => item?.title || 'Column',
          defaultItemProps: { number: '', title: 'COLUMN', body: '', items: '', accent: false },
          arrayFields: {
            number: { type: 'text', label: 'Small number or label' },
            title: { type: 'text', label: 'Title' },
            body: { type: 'textarea', label: 'One line underneath' },
            items: { type: 'textarea', label: 'Checklist — one per line' },
            accent: {
              type: 'radio',
              label: 'Highlight this column',
              options: [
                { label: 'No', value: false },
                { label: 'Yes', value: true },
              ],
            },
          },
        },
        ...footFields,
        footRed: {
          type: 'radio',
          label: 'Red dot before the closing line',
          options: [
            { label: 'No', value: false },
            { label: 'Yes', value: true },
          ],
        },
        workbook: workbookField,
        ...common,
      },
      defaultProps: {
        name: 'Three columns',
        tone: 'light',
        style: 'cards',
        headline: 'Three Things',
        headlineSize: 'large',
        columns: [
          { number: '01', title: 'FIRST', body: 'What this one means.' },
          { number: '02', title: 'SECOND', body: 'What this one means.' },
          { number: '03', title: 'THIRD', body: 'What this one means.' },
        ],
      },
      render: (props) => draw('ColumnsSlide', props),
    },

    /* ---- a × b × c ------------------------------------------------------ */
    EquationSlide: {
      label: 'Equation (a × b × c)',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        headline: { type: 'textarea', label: 'Headline' },
        headlineSize,
        terms: {
          type: 'array',
          label: 'Terms, multiplied together',
          getItemSummary: (item) => item?.term || 'Term',
          defaultItemProps: { term: 'TERM' },
          arrayFields: { term: { type: 'text', label: 'Term' } },
        },
        labels: {
          type: 'array',
          label: 'What each term means',
          getItemSummary: (item) => item?.title || 'Label',
          defaultItemProps: { title: 'TERM', body: 'What it means.', items: '' },
          arrayFields: {
            title: { type: 'text', label: 'Title' },
            body: { type: 'textarea', label: 'The question it answers' },
            items: { type: 'textarea', label: 'Examples — one per line' },
          },
        },
        ...footFields,
        ...common,
      },
      defaultProps: {
        name: 'The framework',
        tone: 'dark',
        eyebrow: 'THE eCommHarvest FRAMEWORK',
        headline: 'How Do We Pull Those Levers?',
        headlineSize: 'large',
        terms: [{ term: 'GOOD SOIL' }, { term: 'GOOD SEED' }, { term: 'CONSISTENT NURTURE' }],
        labels: [],
      },
      render: (props) => draw('EquationSlide', props),
    },

    /* ---- a sum, line by line -------------------------------------------- */
    StackSlide: {
      label: 'Sum (a − b = c)',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        headline: { type: 'textarea', label: 'Headline' },
        headlineSize,
        rows: {
          type: 'array',
          label: 'Lines',
          getItemSummary: (item) => item?.term || 'Line',
          defaultItemProps: { operator: '−', term: 'COST', value: '', emphasis: 'none' },
          arrayFields: {
            operator: { type: 'text', label: 'Operator (−, =, or blank)' },
            term: { type: 'text', label: 'What it is' },
            value: { type: 'text', label: 'Amount (optional)' },
            emphasis: {
              type: 'select',
              label: 'Emphasis',
              options: [
                { label: 'Plain line', value: 'none' },
                { label: 'Subtotal', value: 'subtotal' },
                { label: 'The answer', value: 'answer' },
              ],
            },
          },
        },
        answerQuestion: { type: 'textarea', label: 'Answer card — question' },
        answerSum: { type: 'text', label: 'Answer card — the arithmetic' },
        answerLabel: { type: 'text', label: 'Answer card — label' },
        answerValue: { type: 'text', label: 'Answer card — the number' },
        ...footFields,
        ...common,
      },
      defaultProps: {
        name: 'The sum',
        tone: 'cream',
        headline: 'The Numbers',
        headlineSize: 'small',
        rows: [
          { operator: '', term: 'AVERAGE ORDER VALUE', emphasis: 'none' },
          { operator: '−', term: 'PRODUCT COST', emphasis: 'none' },
          { operator: '=', term: 'WHAT IS LEFT', emphasis: 'answer' },
        ],
      },
      render: (props) => draw('StackSlide', props),
    },

    /* ---- demand shapes --------------------------------------------------- */
    CurvesSlide: {
      label: 'Demand shapes',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        headline: { type: 'textarea', label: 'Headline' },
        headlineSize,
        cards: {
          type: 'array',
          label: 'Shapes',
          getItemSummary: (item) => item?.title || 'Shape',
          defaultItemProps: { shape: 'gift', title: 'PATTERN', body: 'When this buyer buys.' },
          arrayFields: {
            shape: {
              type: 'select',
              label: 'Shape',
              options: [
                { label: 'Peaks at Black Friday', value: 'gift' },
                { label: 'Rebounds after Christmas', value: 'self' },
                { label: 'Spikes at the shipping deadline', value: 'deadline' },
                { label: 'Rises steadily', value: 'rising' },
              ],
            },
            title: { type: 'text', label: 'Title' },
            body: { type: 'textarea', label: 'One line' },
          },
        },
        ...footFields,
        caption: { type: 'text', label: 'Small print under the closing line' },
        workbook: workbookField,
        ...common,
      },
      defaultProps: {
        name: 'Demand shapes',
        tone: 'light',
        headline: 'When Does YOUR Customer Actually Want to Buy?',
        headlineSize: 'small',
        cards: [
          { shape: 'gift', title: 'GIFT-LED', body: 'Peaks around major gifting / Black Friday buying.' },
          { shape: 'self', title: 'SELF-PURCHASE', body: 'Can rebound strongly after Christmas.' },
          { shape: 'deadline', title: 'OCCASION / DEADLINE-LED', body: 'Purchase urgency peaks around arrival / shipping deadlines.' },
        ],
        caption: 'Illustrative patterns, not forecasts.',
      },
      render: (props) => draw('CurvesSlide', props),
    },

    /* ---- a menu of options ----------------------------------------------- */
    MenuSlide: {
      label: 'Menu of options',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        headline: { type: 'textarea', label: 'Headline' },
        headlineSize,
        tiles: {
          type: 'textarea',
          label: 'Options — one per line',
          // Start a line with * to give that tile the gold background.
        },
        question: { type: 'textarea', label: 'Big question at the bottom' },
        ...common,
      },
      defaultProps: {
        name: 'Options',
        tone: 'wash',
        headline: 'A Promotion ≠ A Discount',
        headlineSize: 'large',
        tiles: '% OFF\n$ OFF\n*BUNDLES\nFREE SHIPPING',
        question: 'What behavior are we trying to create?',
      },
      render: (props) => draw('MenuSlide', props),
    },

    /* ---- a horizontal timeline -------------------------------------------- */
    TimelineSlide: {
      label: 'Timeline',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        headline: { type: 'textarea', label: 'Headline' },
        headlineSize,
        stops: {
          type: 'array',
          label: 'Stops',
          getItemSummary: (item) => item?.label || 'Stop',
          defaultItemProps: { label: 'WINDOW', when: '' },
          arrayFields: {
            label: { type: 'text', label: 'Label' },
            when: { type: 'text', label: 'When (small, underneath)' },
          },
        },
        ...footFields,
        ...common,
      },
      defaultProps: {
        name: 'Timeline',
        tone: 'light',
        eyebrow: 'YOUR Q4 CALENDAR',
        headline: 'Q4 Is a Series of Buying Windows.',
        headlineSize: 'large',
        stops: [
          { label: 'PREPARE', when: 'SEPT–OCT' },
          { label: 'BLACK FRIDAY', when: 'LATE NOV' },
          { label: 'GIFTING', when: 'EARLY DEC' },
        ],
      },
      render: (props) => draw('TimelineSlide', props),
    },

    /* ---- questions to fill in --------------------------------------------- */
    FieldsSlide: {
      label: 'Questions to fill in',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        headline: { type: 'textarea', label: 'Headline' },
        headlineSize,
        questions: { type: 'textarea', label: 'Questions — one per line' },
        workbook: { type: 'text', label: 'Workbook banner across the bottom' },
        ...common,
      },
      defaultProps: {
        name: 'Questions',
        tone: 'light',
        headline: 'Build Each Window',
        headlineSize: 'large',
        questions: 'WHEN?\nWHAT ARE WE SELLING?\nWHO IS IT FOR?\nWHAT’S THE OFFER?',
        workbook: 'This is where your plan starts taking shape.',
      },
      render: (props) => draw('FieldsSlide', props),
    },

    /* ---- a progression ----------------------------------------------------- */
    FlowSlide: {
      label: 'Steps in a row',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        headline: { type: 'textarea', label: 'Headline' },
        headlineSize,
        steps: { type: 'textarea', label: 'Steps — one per line' },
        caption: { type: 'text', label: 'Small label under the steps' },
        ...footFields,
        ...common,
      },
      defaultProps: {
        name: 'Steps',
        tone: 'dark',
        headline: 'Don’t Send One Email. Build a Campaign.',
        headlineSize: 'large',
        steps: 'TEASE\nLAUNCH\nPROOF\nLAST CHANCE',
        caption: 'EMAIL + SMS',
      },
      render: (props) => draw('FlowSlide', props),
    },

    /* ---- a picture, beside the words or filling the slide ------------------ */
    ImageSlide: {
      label: 'Picture slide',
      fields: {
        layout: {
          type: 'radio',
          label: 'Layout',
          options: [
            { label: 'Words left, picture right', value: 'split' },
            { label: 'Picture fills the slide', value: 'full' },
          ],
        },
        eyebrow: { type: 'text', label: 'Eyebrow' },
        headline: { type: 'textarea', label: 'Headline' },
        headlineSize,
        lede: { type: 'textarea', label: 'Supporting line' },
        speakerLabel: { type: 'text', label: 'Small label (e.g. SPEAKER)' },
        speakerName: { type: 'text', label: 'Name' },
        image: imageField('Picture', 'Upload or choose. Until then the slide shows a labelled placeholder.'),
        imageLabel: { type: 'text', label: 'Label while there is no picture' },
        ...footFields,
        ...common,
      },
      defaultProps: {
        name: 'Picture slide',
        tone: 'dark',
        layout: 'split',
        headline: 'A Headline',
        headlineSize: 'large',
        imageLabel: '[IMAGE PLACEHOLDER]',
      },
      render: (props) => draw('ImageSlide', props),
    },

    /* ---- the closing question ---------------------------------------------- */
    ChipsSlide: {
      label: 'Topics / Q&A',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        headline: { type: 'textarea', label: 'Headline' },
        headlineSize,
        subhead: { type: 'textarea', label: 'Subhead' },
        chips: { type: 'textarea', label: 'Topics — one per line' },
        ...footFields,
        ...common,
      },
      defaultProps: {
        name: 'Q&A',
        tone: 'dark',
        headline: 'What Are You Stuck On?',
        headlineSize: 'large',
        subhead: 'Live Q&A',
        chips: 'ADS\nEMAIL / SMS\nOFFERS\nPLANNING',
      },
      render: (props) => draw('ChipsSlide', props),
    },
  },
}

export type DeckData = Data<SlideBlocks>

/**
 * What a brand-new deck opens with.
 *
 * A title slide and one working content slide, for the same reason the page
 * builder does it: an empty canvas is where people give up.
 */
export const deckStarter = [
  { type: 'TitleSlide', props: { ...slidesConfig.components.TitleSlide.defaultProps, id: 'slide-title' } },
  { type: 'ColumnsSlide', props: { ...slidesConfig.components.ColumnsSlide.defaultProps, id: 'slide-columns' } },
]
