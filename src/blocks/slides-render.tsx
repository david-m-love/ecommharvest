import React from 'react'

import { BlockImage } from './BlockImage'
import type { PickedImage } from './ImagePicker'

/* ============================================================================
   How a slide is drawn.
   ----------------------------------------------------------------------------
   One file, two consumers: the page builder's canvas and the live deck at
   /masterclass/slides. Both call `renderSlide`, so a slide cannot look like one
   thing while you are editing it and another when you present it — which is the
   failure that makes a WYSIWYG editor not worth having.

   The *fields* live next door in `slides.tsx`, which is the Puck config. They
   are split because this half renders on the server for the public deck, and
   the fields half pulls in the image picker and the rest of the editor.

   Nothing here uppercases text. Labels that read as capitals are typed as
   capitals by whoever writes the slide, so the brand survives as eCommHarvest.
   ========================================================================== */

export type SlideTone = 'light' | 'cream' | 'wash' | 'dark'

/** On every slide, whatever its layout. */
export type SlideCommon = {
  /** What this slide is called in the slide list and the jump grid (press G). */
  name?: string
  tone?: SlideTone
  /**
   * A private reminder — "waiting on Derek's framework". Shown in the jump grid
   * and in the builder, never on the slide itself, so a deck with unfinished
   * slides can still be presented in front of an audience.
   */
  note?: string
  /**
   * A presenter's cue — "EXAMPLE: Shopify growth view".
   *
   * This one *is* on the slide, beside the brand mark, small and quiet. It is a
   * reminder to the presenter to show the real thing at this point, and an
   * audience reading it learns only that an example is coming.
   */
  cue?: string
}

/** Headlines are sized by hand, because the right size depends on the words. */
export type HeadlineSize = 'large' | 'medium' | 'small'

/** Anything the slide needs that is not on the slide itself. */
export type SlideContext = { siteLogoUrl?: string | null }

/* ---------------------------------------------------------------------------
   Shared pieces.
   ------------------------------------------------------------------------- */

/** A textarea field, as a list. Blank lines are dropped, so spacing is free. */
export const lines = (text?: string): string[] =>
  (text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

const headlineClass = (size?: HeadlineSize) =>
  `sl-h2 sl-h2-wide${size === 'small' ? ' sl-h2-xs' : size === 'medium' ? ' sl-h2-sm' : ''}`

const Eyebrow = ({ text }: { text?: string }) =>
  text ? <p className="sl-eyebrow">{text}</p> : null

const Headline = ({ text, size }: { text?: string; size?: HeadlineSize }) =>
  text ? <h2 className={headlineClass(size)}>{text}</h2> : null

/**
 * Gold for the half of a sentence that matters, written as *between asterisks*.
 *
 * One field with a convention, rather than two fields — "line" and "emphasised
 * line" — because the emphasis is as often a phrase inside a sentence as a
 * second line under it, and a pair of fields can only ever do the second.
 */
export const emphasise = (text: string): React.ReactNode =>
  text.split(/\*([^*]+)\*/g).map((part, i) =>
    // Odd indices are what was between the asterisks.
    i % 2 ? <em key={i}>{part}</em> : <React.Fragment key={i}>{part}</React.Fragment>,
  )

/** The closing line: the one sentence that is the point of the slide. */
const Foot = ({ text, centre, red }: { text?: string; centre?: boolean; red?: boolean }) => {
  const rows = lines(text)
  if (!rows.length) return null
  return (
    <p className={`sl-foot${centre ? ' sl-foot-centre' : ''}${red ? ' sl-redline' : ''}`}>
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <br /> : null}
          {emphasise(row)}
        </React.Fragment>
      ))}
    </p>
  )
}

const WorkbookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 3.5h10.5L19 7v13.5H5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M15 3.5V7h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M8 11.5h8M8 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

/**
 * The workbook chip.
 *
 * The moments the presenter may stop teaching and screen-share the workbook.
 * Same marker every time, so by the third one the room knows what it means
 * without being told. Empty field, no chip.
 */
const Workbook = ({ text, large }: { text?: string; large?: boolean }) =>
  text ? (
    <p className={large ? 'sl-wb sl-wb-lg' : 'sl-wb'}>
      <WorkbookIcon />
      <span>WORKBOOK → {text}</span>
    </p>
  ) : null

/**
 * A picture, or a branded box waiting for one.
 *
 * The frame is the same either way: choosing an image in the builder fills the
 * box that was already holding its place, so the layout never moves when the
 * real photograph arrives.
 */
export const SlidePicture = ({
  image,
  label,
  className = '',
  sizes,
}: {
  image?: PickedImage
  label?: string
  className?: string
  sizes?: string
}) =>
  image?.url ? (
    <div className={`sl-ph sl-ph-filled ${className}`}>
      <BlockImage image={image} fallbackAlt={label || ''} sizes={sizes} />
    </div>
  ) : (
    <div className={`sl-ph ${className}`} data-placeholder={label || 'IMAGE'}>
      <svg className="sl-ph-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="8.5" cy="10" r="1.7" stroke="currentColor" strokeWidth="1.4" />
        <path d="M3 17l5-4.5 4 3.5 3.5-3 5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      <p className="sl-ph-label">{label || 'Choose an image'}</p>
    </div>
  )

/**
 * The three Q4 demand shapes, drawn rather than charted.
 *
 * Deliberately a fixed set of three: these are the *shapes* of common buying
 * patterns, not anyone's revenue, and a chart built from typed-in numbers would
 * be a claim the data cannot support. The slide says so underneath.
 */
export const CURVE_SHAPES = {
  gift: 'M2,27 C 20,26 34,23 50,19 C 62,16 70,6 78,5 C 88,4 98,14 108,22',
  self: 'M2,22 C 16,21 28,23 42,22 C 56,21 66,24 78,24 C 90,24 98,19 106,11 C 110,7 114,5 118,4',
  deadline: 'M2,26 C 20,25 36,24 52,23 C 66,22 78,19 88,11 C 91,8 94,5 96,4 C 100,7 104,17 110,24',
  rising: 'M2,26 C 22,25 42,23 62,19 C 82,15 100,9 118,4',
} as const

export type CurveShape = keyof typeof CURVE_SHAPES

const Curve = ({ shape }: { shape?: CurveShape }) => {
  const d = CURVE_SHAPES[shape || 'gift'] ?? CURVE_SHAPES.gift
  return (
    <>
      <svg className="sl-curve" viewBox="0 0 120 30" fill="none" aria-hidden="true">
        <path d={`${d} L118,28 L2,28 Z`} fill="currentColor" fillOpacity="0.12" />
        <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <path d="M2,28 H118" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.4" />
      </svg>
      <div className="sl-curve-axis">
        <span>OCT</span>
        <span>NOV</span>
        <span>DEC</span>
        <span>JAN</span>
      </div>
    </>
  )
}

/* ---------------------------------------------------------------------------
   The props each layout takes. These are exactly the fields in `slides.tsx`.
   ------------------------------------------------------------------------- */

export type TitleSlideProps = SlideCommon & {
  eyebrow?: string
  headline?: string
  supporting?: string
  hostsLabel?: string
  hostsNames?: string
  logo?: PickedImage
}

export type StatsSlideProps = SlideCommon & {
  headline?: string
  headlineSize?: HeadlineSize
  stats?: { number?: string; unit?: string; says?: string }[]
  itemsTitle?: string
  items?: string
  foot?: string
  image?: PickedImage
  imageLabel?: string
}

export type ColumnsSlideProps = SlideCommon & {
  eyebrow?: string
  headline?: string
  headlineSize?: HeadlineSize
  style?: 'cards' | 'pillars'
  columns?: { number?: string; title?: string; body?: string; items?: string; accent?: boolean }[]
  foot?: string
  footRed?: boolean
  workbook?: string
}

export type EquationSlideProps = SlideCommon & {
  eyebrow?: string
  headline?: string
  headlineSize?: HeadlineSize
  terms?: { term?: string }[]
  labels?: { title?: string; body?: string; items?: string }[]
  foot?: string
}

export type StackSlideProps = SlideCommon & {
  eyebrow?: string
  headline?: string
  headlineSize?: HeadlineSize
  rows?: { operator?: string; term?: string; value?: string; emphasis?: 'none' | 'subtotal' | 'answer' }[]
  answerQuestion?: string
  answerSum?: string
  answerLabel?: string
  answerValue?: string
  foot?: string
}

export type CurvesSlideProps = SlideCommon & {
  eyebrow?: string
  headline?: string
  headlineSize?: HeadlineSize
  cards?: { shape?: CurveShape; title?: string; body?: string }[]
  foot?: string
  caption?: string
  workbook?: string
}

export type MenuSlideProps = SlideCommon & {
  eyebrow?: string
  headline?: string
  headlineSize?: HeadlineSize
  tiles?: string
  question?: string
}

export type TimelineSlideProps = SlideCommon & {
  eyebrow?: string
  headline?: string
  headlineSize?: HeadlineSize
  stops?: { label?: string; when?: string }[]
  foot?: string
}

export type FieldsSlideProps = SlideCommon & {
  eyebrow?: string
  headline?: string
  headlineSize?: HeadlineSize
  questions?: string
  workbook?: string
}

export type FlowSlideProps = SlideCommon & {
  eyebrow?: string
  headline?: string
  headlineSize?: HeadlineSize
  steps?: string
  caption?: string
  foot?: string
}

export type ImageSlideProps = SlideCommon & {
  layout?: 'split' | 'full'
  eyebrow?: string
  headline?: string
  headlineSize?: HeadlineSize
  lede?: string
  speakerLabel?: string
  speakerName?: string
  image?: PickedImage
  imageLabel?: string
  foot?: string
}

export type ChipsSlideProps = SlideCommon & {
  eyebrow?: string
  headline?: string
  headlineSize?: HeadlineSize
  subhead?: string
  chips?: string
  foot?: string
}

export type SlideProps =
  | TitleSlideProps
  | StatsSlideProps
  | ColumnsSlideProps
  | EquationSlideProps
  | StackSlideProps
  | CurvesSlideProps
  | MenuSlideProps
  | TimelineSlideProps
  | FieldsSlideProps
  | FlowSlideProps
  | ImageSlideProps
  | ChipsSlideProps

/* ---------------------------------------------------------------------------
   The layouts.
   ------------------------------------------------------------------------- */

/** A line starting with `*` is the one tile or column that carries the gold. */
const accented = (line: string) => line.startsWith('*')
const plain = (line: string) => line.replace(/^\*\s*/, '')

const TitleSlide = (p: TitleSlideProps, ctx: SlideContext) => {
  const logo = p.logo?.url ? p.logo : ctx.siteLogoUrl ? { url: ctx.siteLogoUrl, alt: 'eCommHarvest' } : null
  return (
    <>
      <div className="sl-brand">
        {logo ? (
          <BlockImage image={logo} fallbackAlt="eCommHarvest" sizes="600px" priority />
        ) : (
          <span className="sl-brand-text">eCommHarvest</span>
        )}
      </div>
      <div className="sl-body sl-centre">
        <Eyebrow text={p.eyebrow} />
        {p.headline ? <h1 className="sl-h1 sl-h1-centre">{p.headline}</h1> : null}
        {p.supporting ? <p className="sl-lede sl-lede-centre">{p.supporting}</p> : null}
        {p.hostsLabel || p.hostsNames ? (
          <div className="sl-hosts">
            {p.hostsLabel ? <p className="sl-hosts-label">{p.hostsLabel}</p> : null}
            {p.hostsNames ? <p className="sl-hosts-names">{p.hostsNames}</p> : null}
          </div>
        ) : null}
      </div>
    </>
  )
}

const StatsSlide = (p: StatsSlideProps) => {
  const stats = p.stats || []
  return (
    <>
      <Headline text={p.headline} size={p.headlineSize} />
      <div className="sl-body">
        <div className={`sl-cols sl-cols-${Math.min(Math.max(stats.length, 1), 3)}`}>
          {stats.map((stat, i) => (
            <div className={i === 0 ? 'sl-card sl-card-accent' : 'sl-card'} key={i}>
              <p className="sl-stat">
                <span className="sl-stat-n">{stat.number}</span>
                <span className="sl-stat-u">{stat.unit}</span>
              </p>
              <p className="sl-stat-say">{stat.says}</p>
            </div>
          ))}
        </div>
        {/* What the room walks out knowing. Three across, so six outcomes cost
            two lines rather than six. */}
        {lines(p.items).length ? (
          <div className="sl-outcomes">
            {p.itemsTitle ? <p className="sl-outcomes-t">{p.itemsTitle}</p> : null}
            <div className="sl-outcomes-grid">
              {lines(p.items).map((item, i) => (
                <span key={i}>{item}</span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="sl-footrow">
        <div>
          <Foot text={p.foot} />
        </div>
        {p.image?.url || p.imageLabel ? (
          <SlidePicture image={p.image} label={p.imageLabel} className="sl-ph-thumb" sizes="240px" />
        ) : null}
      </div>
    </>
  )
}

const ColumnsSlide = (p: ColumnsSlideProps) => {
  const columns = p.columns || []
  const count = Math.min(Math.max(columns.length, 1), 5)
  const pillars = p.style === 'pillars'
  return (
    <>
      <Eyebrow text={p.eyebrow} />
      <Headline text={p.headline} size={p.headlineSize} />
      <div className="sl-body">
        <div className={`sl-cols sl-cols-${count}`}>
          {columns.map((column, i) => {
            const items = lines(column.items)
            return (
              <div
                className={`sl-card${column.accent ? ' sl-card-accent' : ''}${pillars ? ' sl-pillar' : ''}`}
                key={i}
              >
                {column.number ? <p className="sl-num">{column.number}</p> : null}
                {column.title ? (
                  <p className={count > 3 || items.length ? 'sl-ct sl-ct-sm' : 'sl-ct'}>{column.title}</p>
                ) : null}
                {column.body ? <p className="sl-cp">{column.body}</p> : null}
                {items.length ? (
                  /* A long list in a wide column runs in two, so eight options
                     cost four rows rather than eight and the headline above
                     keeps its room. */
                  <ul className={count <= 2 && items.length > 4 ? 'sl-list sl-list-2col' : 'sl-list'}>
                    {items.map((item, n) => (
                      <li key={n}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {pillars ? <span className="sl-rule" /> : null}
              </div>
            )
          })}
        </div>
      </div>
      {p.foot || p.workbook ? (
        <div className="sl-footrow">
          <Foot text={p.foot} red={p.footRed} />
          <Workbook text={p.workbook} />
        </div>
      ) : null}
    </>
  )
}

const EquationSlide = (p: EquationSlideProps) => {
  const terms = (p.terms || []).map((term) => term.term).filter(Boolean)
  const labels = p.labels || []
  return (
    <>
      <Eyebrow text={p.eyebrow} />
      <Headline text={p.headline} size={p.headlineSize} />
      <div className="sl-body">
        <p className="sl-eq">
          {terms.map((term, i) => (
            <React.Fragment key={i}>
              {i > 0 ? <span className="sl-eq-x">×</span> : null}
              <span>{term}</span>
            </React.Fragment>
          ))}
        </p>
        {labels.length ? (
          <div className={`sl-cols sl-cols-${Math.min(Math.max(labels.length, 1), 5)} sl-cols-tight`}>
            {labels.map((label, i) => (
              <div key={i}>
                {label.title ? <p className="sl-ct sl-ct-sm">{label.title}</p> : null}
                {label.body ? <p className="sl-cp">{label.body}</p> : null}
                {/* Examples on one line, separated by the site's own middot —
                    a list of seven words should not cost seven lines. */}
                {lines(label.items).length ? (
                  <p className="sl-examples">{lines(label.items).join(' · ')}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <Foot text={p.foot} />
    </>
  )
}

const StackSlide = (p: StackSlideProps) => {
  const rows = p.rows || []
  const hasAnswer = Boolean(p.answerValue || p.answerQuestion)
  const stack = (
    <div className={hasAnswer ? 'sl-stack sl-stack-wide' : 'sl-stack'}>
      {rows.map((row, i) => (
        <div
          className={`sl-row${row.emphasis === 'subtotal' ? ' sl-row-sum' : ''}${
            row.emphasis === 'answer' ? ' sl-row-total' : ''
          }`}
          key={i}
        >
          <span className="sl-op">{row.operator}</span>
          <span className="sl-term">{row.term}</span>
          {row.value ? <span className="sl-val">{row.value}</span> : null}
        </div>
      ))}
    </div>
  )
  return (
    <>
      <Eyebrow text={p.eyebrow} />
      <Headline text={p.headline} size={p.headlineSize} />
      <div className="sl-body">
        {hasAnswer ? (
          <div className="sl-split">
            {stack}
            <div className="sl-answer">
              {p.answerQuestion ? <p className="sl-answer-q">{p.answerQuestion}</p> : null}
              {p.answerSum ? <p className="sl-answer-sum">{p.answerSum}</p> : null}
              {p.answerLabel ? <p className="sl-answer-label">{p.answerLabel}</p> : null}
              {p.answerValue ? <p className="sl-answer-n">{p.answerValue}</p> : null}
            </div>
          </div>
        ) : (
          stack
        )}
      </div>
      <Foot text={p.foot} centre />
    </>
  )
}

const CurvesSlide = (p: CurvesSlideProps) => {
  const cards = p.cards || []
  return (
    <>
      <Eyebrow text={p.eyebrow} />
      <Headline text={p.headline} size={p.headlineSize} />
      <div className="sl-body">
        <div className={`sl-cols sl-cols-${Math.min(Math.max(cards.length, 1), 4)}`}>
          {cards.map((card, i) => (
            <div className="sl-card" key={i}>
              <Curve shape={card.shape} />
              {card.title ? <p className="sl-ct sl-ct-sm">{card.title}</p> : null}
              {card.body ? <p className="sl-cp">{card.body}</p> : null}
            </div>
          ))}
        </div>
      </div>
      <div className="sl-footrow">
        <div>
          <Foot text={p.foot} />
          {p.caption ? <p className="sl-foot-2">{p.caption}</p> : null}
        </div>
        <Workbook text={p.workbook} />
      </div>
    </>
  )
}

const MenuSlide = (p: MenuSlideProps) => {
  const tiles = lines(p.tiles)
  return (
    <>
      <Eyebrow text={p.eyebrow} />
      <Headline text={p.headline} size={p.headlineSize} />
      <div className="sl-body">
        {/* Four across for eight tiles, five for ten: a last row with two
            orphans in it looks like a mistake rather than a menu. */}
        <div
          className="sl-menu"
          style={{ gridTemplateColumns: `repeat(${tiles.length % 5 === 0 ? 5 : tiles.length % 4 === 0 ? 4 : tiles.length % 3 === 0 ? 3 : 5}, 1fr)` }}
        >
          {tiles.map((tile, i) => (
            <span className={accented(tile) ? 'sl-tile sl-tile-gold' : 'sl-tile'} key={i}>
              {plain(tile)}
            </span>
          ))}
        </div>
      </div>
      {p.question ? <p className="sl-foot sl-foot-big">{p.question}</p> : null}
    </>
  )
}

const TimelineSlide = (p: TimelineSlideProps) => {
  const stops = p.stops || []
  return (
    <>
      <Eyebrow text={p.eyebrow} />
      <Headline text={p.headline} size={p.headlineSize} />
      <div className="sl-body">
        <div className="sl-time" style={{ gridTemplateColumns: `repeat(${Math.max(stops.length, 1)}, 1fr)` }}>
          {stops.map((stop, i) => (
            <div className="sl-stop" key={i}>
              <span className="sl-dot" />
              {stop.label ? <p className="sl-stop-label">{stop.label}</p> : null}
              {stop.when ? <p className="sl-stop-when">{stop.when}</p> : null}
            </div>
          ))}
        </div>
      </div>
      <Foot text={p.foot} />
    </>
  )
}

const FieldsSlide = (p: FieldsSlideProps) => {
  const questions = lines(p.questions)
  return (
    <>
      <Eyebrow text={p.eyebrow} />
      <Headline text={p.headline} size={p.headlineSize} />
      <div className="sl-body">
        <div
          className={`sl-cols sl-cols-${questions.length > 4 ? 3 : 2} sl-cols-fields`}
          style={{ gridTemplateRows: `repeat(${Math.ceil(questions.length / (questions.length > 4 ? 3 : 2))}, 1fr)` }}
        >
          {questions.map((question, i) => (
            <div className="sl-field" key={i}>
              <p className="sl-field-q">{question}</p>
              <span className="sl-rule" />
            </div>
          ))}
        </div>
      </div>
      <Workbook text={p.workbook} large />
    </>
  )
}

const FlowSlide = (p: FlowSlideProps) => {
  const steps = lines(p.steps)
  return (
    <>
      <Eyebrow text={p.eyebrow} />
      <Headline text={p.headline} size={p.headlineSize} />
      <div className="sl-body">
        <div className="sl-flow">
          {steps.map((step, i) => (
            <React.Fragment key={i}>
              {i > 0 ? <span className="sl-arrow">→</span> : null}
              <span className={i === steps.length - 1 ? 'sl-step sl-step-last' : 'sl-step'}>
                <span className="sl-step-n">{String(i + 1).padStart(2, '0')}</span>
                {step}
              </span>
            </React.Fragment>
          ))}
        </div>
        {p.caption ? <p className="sl-note sl-note-centre">{p.caption}</p> : null}
      </div>
      <Foot text={p.foot} />
    </>
  )
}

const ImageSlide = (p: ImageSlideProps) => {
  if (p.layout === 'full')
    return (
      <>
        <Eyebrow text={p.eyebrow} />
        <Headline text={p.headline} size={p.headlineSize} />
        <div className="sl-body">
          <SlidePicture image={p.image} label={p.imageLabel} className="sl-ph-block" sizes="1100px" />
        </div>
        <Foot text={p.foot} centre />
      </>
    )

  return (
    <div className="sl-body">
      <div className="sl-split sl-split-portrait">
        <div>
          <Eyebrow text={p.eyebrow} />
          <Headline text={p.headline} size={p.headlineSize} />
          {p.lede ? <p className="sl-lede">{p.lede}</p> : null}
          {p.speakerLabel || p.speakerName ? (
            <div className="sl-speaker">
              {p.speakerLabel ? <p className="sl-hosts-label">{p.speakerLabel}</p> : null}
              {p.speakerName ? <p className="sl-hosts-names">{p.speakerName}</p> : null}
            </div>
          ) : null}
        </div>
        <SlidePicture image={p.image} label={p.imageLabel} className="sl-ph-portrait" sizes="420px" />
      </div>
    </div>
  )
}

const ChipsSlide = (p: ChipsSlideProps) => {
  const chips = lines(p.chips)
  return (
    <div className="sl-body sl-centre">
      <Eyebrow text={p.eyebrow} />
      {p.headline ? <h2 className={`${headlineClass(p.headlineSize)} sl-h2-centre`}>{p.headline}</h2> : null}
      {p.subhead ? <p className="sl-lede sl-lede-centre">{p.subhead}</p> : null}
      {chips.length ? (
        <div className="sl-chips">
          {chips.map((chip, i) => (
            <span className="sl-chip" key={i}>
              {chip}
            </span>
          ))}
        </div>
      ) : null}
      <Foot text={p.foot} centre />
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Putting a slide on the stage.
   ------------------------------------------------------------------------- */

/**
 * Every layout, by the name stored in the page's JSON.
 *
 * The cast at the call site is the one piece of looseness here: block props come
 * out of the database as JSON, so there is nothing for the compiler to check
 * them against. An unknown block type renders nothing rather than throwing — a
 * deck that has lost one slide can still be presented; a deck that throws in
 * front of an audience cannot.
 */
const LAYOUTS = {
  TitleSlide,
  StatsSlide,
  ColumnsSlide,
  EquationSlide,
  StackSlide,
  CurvesSlide,
  MenuSlide,
  TimelineSlide,
  FieldsSlide,
  FlowSlide,
  ImageSlide,
  ChipsSlide,
} as const

export type SlideType = keyof typeof LAYOUTS

export type SlideBlock = { type: string; props?: Record<string, unknown> }

export const isSlideType = (type: string): type is SlideType => type in LAYOUTS

/**
 * One slide, frame and all.
 *
 * The frame is what carries the 16:9 shape and the container the slide's `cqw`
 * sizes are measured against, so it is part of the slide rather than part of
 * the deck — which is exactly why the builder's canvas can show a real slide
 * without reimplementing anything.
 */
export const renderSlide = (block: SlideBlock, ctx: SlideContext = {}): React.ReactElement | null => {
  if (!isSlideType(block.type)) return null
  const props = (block.props ?? {}) as SlideProps
  const Layout = LAYOUTS[block.type] as (p: SlideProps, c: SlideContext) => React.ReactNode
  return (
    <div className="sl-frame">
      <section className={`sl sl-${props.tone ?? 'light'}`} aria-roledescription="slide">
        {Layout(props, ctx)}
        {/* The brand, quietly, on every slide but the title — which carries it
            full size already. */}
        {block.type === 'TitleSlide' ? null : (
          <span className="sl-mark">
            eCommHarvest
            {/* The separator is markup rather than a CSS `::before`, so the
                cue reads as its own phrase to anything copying the text. */}
            {props.cue ? <em className="sl-cue"> · {props.cue}</em> : null}
          </span>
        )}
      </section>
    </div>
  )
}

/** What the jump grid and the slide list need to know, without rendering. */
export const slideMeta = (block: SlideBlock, index: number) => {
  const props = (block.props ?? {}) as SlideCommon
  return {
    name: props.name?.trim() || `Slide ${index + 1}`,
    tone: props.tone ?? 'light',
    note: props.note?.trim() || undefined,
  }
}
