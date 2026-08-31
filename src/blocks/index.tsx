import type { Config, Data } from '@measured/puck'
import React from 'react'

import { BlockImage } from './BlockImage'
import { isExternalHref, toHref } from '@/lib/href'
import type { RecentPost } from '@/lib/site-styles'

import { SiteHeaderBar } from './SiteHeaderBar'
import { type PickedImage, imageField } from './image-field'

/**
 * The block library the page builder drags and drops.
 *
 * Every block renders using the classes in `src/styles/design-system.css` — the
 * same stylesheet as the masterclass page. That is the whole design decision
 * here: a block cannot go off-brand, because it has no colours, sizes or fonts
 * of its own to get wrong. The editable surface is text, links and how many
 * items are in a list.
 *
 * Each block also carries `defaultProps` with real copy, so dragging in a hero
 * lands a finished-looking hero rather than an empty box waiting to be filled.
 * That was the point of presets: start from something, edit it down.
 *
 * Adding a block: write the component, add it to `components`, list it in a
 * category. No database migration — layouts are stored as JSON.
 */

// --- shared pieces ------------------------------------------------------

/**
 * Paragraph text split on blank lines.
 *
 * Textarea fields are the only multi-paragraph input Puck offers without
 * building a rich-text field, so a blank line is the paragraph break. Cheap,
 * predictable, and it degrades to one paragraph rather than to broken markup.
 */
const Paragraphs = ({ text, className }: { text?: string; className?: string }) => (
  <>
    {(text || '')
      .split(/\n{2,}/)
      .map((para) => para.trim())
      .filter(Boolean)
      .map((para, i) => (
        <p key={i} className={className}>
          {para}
        </p>
      ))}
  </>
)

/** A CTA button. Blank link renders as no button rather than a dead one. */
const Cta = ({ label, href, large }: { label?: string; href?: string; large?: boolean }) => {
  const target = toHref(href)
  if (!label || !target) return null
  const external = isExternalHref(target)
  return (
    <a
      className={large ? 'btn btn-lg' : 'btn'}
      href={target}
      {...(external ? { target: '_blank', rel: 'noopener' } : {})}
    >
      {label}
    </a>
  )
}

/**
 * Document body: paragraphs, and lists where a line starts with a dash.
 *
 * Legal text alternates between the two — "the form asks for:", then the list,
 * then two more paragraphs — and order carries meaning. An earlier version kept
 * lists in a separate field, which meant every list rendered *after* every
 * paragraph in its section: all the words present, the sense rearranged. One
 * field in document order is both more faithful and less to explain.
 */
const DocumentBody = ({ text }: { text?: string }) => {
  const lines = (text || '').split('\n')
  const parts: { list: boolean; items: string[] }[] = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const isBullet = /^[-•*]\s+/.test(line)
    const content = isBullet ? line.replace(/^[-•*]\s+/, '') : line
    const last = parts[parts.length - 1]
    // Consecutive bullets are one list; consecutive plain lines are separate
    // paragraphs, because the blank line between them has already been dropped.
    if (last && last.list && isBullet) last.items.push(content)
    else parts.push({ list: isBullet, items: [content] })
  }

  return (
    <>
      {parts.map((part, i) =>
        part.list ? (
          <ul key={i}>
            {part.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ) : (
          part.items.map((item, j) => <p key={`${i}-${j}`}>{item}</p>)
        ),
      )}
    </>
  )
}

/**
 * Where a button goes.
 *
 * A full web address or a path on this site — `go.ecommharvest.com/register` and
 * `/register` both work, and `https://` is filled in when it is missing. See
 * `src/lib/href.ts` for why that matters: without it, an address typed without
 * `https://` is glued onto the end of the current one.
 */
const linkField = {
  type: 'text' as const,
  label: 'Button link',
  placeholder: 'go.ecommharvest.com/register',
}

// --- the blocks ---------------------------------------------------------

export type Blocks = {
  Header: {
    logoText?: string
    homeUrl?: string
    rightText?: string
    showMenu?: boolean
  }
  Hero: {
    eyebrow?: string
    heading?: string
    deck?: string
    body?: string
    when?: string
    ctaLabel?: string
    ctaHref?: string
    ctaMicro?: string
  }
  HostedBy: {
    label?: string
    hosts?: {
      name: string
      monogram?: string
      logo?: PickedImage
      /** What the logo needs behind it to be visible. */
      logoBackground?: 'none' | 'white' | 'dark'
      logoSize?: 'small' | 'medium' | 'large'
      /**
       * Whether to print the brand name beside the logo. Undefined means "decide
       * from the logo" — a lockup already says the name, initials do not.
       */
      showName?: boolean
      href?: string
    }[]
  }
  DarkCard: { eyebrow?: string; heading?: string; body?: string; kicker?: string }
  BulletList: {
    eyebrow?: string
    leadIn?: string
    bullets?: { lead?: string; text?: string }[]
    ctaLabel?: string
    ctaHref?: string
    ctaMicro?: string
  }
  FormulaBar: { terms?: { term: string }[]; result?: string; caption?: string; note?: string }
  CardRow: {
    eyebrow?: string
    heading?: string
    body?: string
    cards?: { title?: string; body?: string }[]
    background?: 'white' | 'wash'
  }
  Speakers: {
    eyebrow?: string
    heading?: string
    ctaLabel?: string
    ctaHref?: string
    ctaMicro?: string
    people?: {
      label?: string
      name?: string
      title?: string
      monogram?: string
      photo?: PickedImage
      body?: string
    }[]
  }
  CtaCard: {
    eyebrow?: string
    heading?: string
    body?: string
    ctaLabel?: string
    ctaHref?: string
    note?: string
  }
  PageHeading: { eyebrow?: string; heading?: string; body?: string }
  LegalText: { heading?: string; body?: string }
  Prose: { eyebrow?: string; heading?: string; body?: string; background?: 'white' | 'wash' }
  PostList: { eyebrow?: string; heading?: string; body?: string; count?: number; ctaLabel?: string }
  Footer: { copyright?: string; links?: { label: string; href: string }[]; note?: string }
}

export const config: Config<Blocks> = {
  /**
   * No root fields.
   *
   * Left undefined, Puck offers a root `title` field in the right-hand panel
   * when nothing is selected. It looks like it sets the page title and does
   * not — the real title lives on the Pages record, so two inputs would
   * disagree. An empty object removes it.
   */
  root: { fields: {} },
  categories: {
    'Top of page': {
      title: 'Top of page',
      components: ['Header', 'Hero', 'PageHeading', 'HostedBy'],
      defaultExpanded: true,
    },
    Body: {
      title: 'Body sections',
      components: ['DarkCard', 'BulletList', 'FormulaBar', 'CardRow', 'Speakers', 'Prose', 'LegalText'],
      defaultExpanded: true,
    },
    'Bottom of page': { title: 'Bottom of page', components: ['PostList', 'CtaCard', 'Footer'] },
  },
  components: {
    Header: {
      label: 'Header (logo bar)',
      /**
       * No logo picker here, on purpose.
       *
       * There used to be one, and it made the logo neither global nor local: a
       * page could carry its own image while the *size* came from Site Styles,
       * so changing the size appeared to do nothing on some pages and
       * everything on others, and adding this block to a new page produced a
       * different logo again. Impossible to reason about, and the confusion was
       * entirely self-inflicted.
       *
       * The logo is now one thing in one place — Site Styles — for every page.
       * This block chooses where it sits and what goes beside it.
       */
      fields: {
        logoText: { type: 'text', label: 'Name (shown if no logo is uploaded)' },
        homeUrl: { type: 'text', label: 'Logo links to' },
        rightText: { type: 'text', label: 'Small text on the right' },
        /**
         * Per page, while the menu's *contents* are global.
         *
         * That split is deliberate: a landing page whose job is one button
         * converts better without a menu offering five ways to leave, and a
         * normal page reads as broken without one. So the links live in one
         * place and each page decides whether to show them.
         */
        showMenu: {
          type: 'radio',
          label: 'Menu',
          options: [
            { label: 'Show the site menu', value: true },
            { label: 'Hide it (best for a landing page)', value: false },
          ],
        },
      },
      defaultProps: {
        logoText: 'eCommHarvest',
        homeUrl: 'https://ecommharvest.com/',
        rightText: 'Thursday, September 10 · 11:00 AM MT · free',
        showMenu: true,
      },
      /**
       * The site logo, or the name as text if none is uploaded.
       *
       * The logo arrives as Puck metadata rather than being read here,
       * because a block's render is a plain synchronous component — it cannot
       * query the database. Whoever renders the page passes it in, which also
       * keeps the builder canvas showing the same logo the live page will.
       *
       * Height is not a prop: it comes from the --logo-h variable that Site
       * Styles emits, so changing the size changes every page at once.
       */
      render: ({ logoText, homeUrl, rightText, showMenu, puck }) => {
        const site = puck?.metadata as
          | {
              siteLogoUrl?: string
              siteLogoText?: string
              siteLogoWidth?: number
              siteLogoHeight?: number
              siteNavLinks?: { label: string; href: string; emphasis?: boolean }[]
            }
          | undefined
        const url = site?.siteLogoUrl
        // `!== false` so a page saved before this field existed still shows the
        // menu rather than silently losing it.
        const links = showMenu !== false ? (site?.siteNavLinks ?? []) : []
        /**
         * The markup lives in `SiteHeaderBar` because the blog's routes need the
         * same bar and have no block to put it in. One component, so a visitor
         * arriving on an article never sees a different header from one arriving
         * on the home page.
         */
        return (
          <SiteHeaderBar
            logoUrl={url}
            /* The per-page name if there is one, otherwise the site's. */
            logoText={logoText || site?.siteLogoText}
            logoWidth={site?.siteLogoWidth}
            logoHeight={site?.siteLogoHeight}
            links={links}
            homeUrl={homeUrl}
            rightText={rightText}
          />
        )
      },
    },

    Hero: {
      label: 'Hero',
      fields: {
        eyebrow: { type: 'text', label: 'Badge above the headline' },
        heading: { type: 'textarea', label: 'Headline' },
        deck: { type: 'textarea', label: 'Sub-headline' },
        body: { type: 'textarea', label: 'Lead paragraph' },
        when: { type: 'text', label: 'Date / time line' },
        ctaLabel: { type: 'text', label: 'Button text' },
        ctaHref: linkField,
        ctaMicro: { type: 'text', label: 'Small text beside the button' },
      },
      defaultProps: {
        eyebrow: 'Free masterclass for LDS e-commerce founders',
        heading: 'Your Q4 Revenue Playbook, Built in 90 Minutes.',
        deck: '…without headaches or sacrificing family time.',
        body: 'Walk in with Q4 still scattered across notes, ideas, and half-finished plans. Walk out knowing what you’re promoting, when you’re promoting it, and what needs to be ready before the holiday rush.',
        when: 'Thursday, September 10 · 11:00 AM MT',
        ctaLabel: 'Save my seat',
        ctaHref: '/register',
        ctaMicro: 'Free · 90 minutes · replay available',
      },
      render: ({ eyebrow, heading, deck, body, when, ctaLabel, ctaHref, ctaMicro }) => (
        <div className="slot hero">
          <div className="slot-in">
            {eyebrow ? <p className="badge">{eyebrow}</p> : null}
            {heading ? <h1>{heading}</h1> : null}
            {deck ? <p className="deck">{deck}</p> : null}
            <Paragraphs text={body} className="lede" />
            {when ? (
              <p className="when">
                <strong>{when}</strong>
              </p>
            ) : null}
            {ctaLabel ? (
              <div className="cta-row">
                <Cta label={ctaLabel} href={ctaHref} large />
                {ctaMicro ? <span className="cta-micro">{ctaMicro}</span> : null}
              </div>
            ) : null}
          </div>
        </div>
      ),
    },

    HostedBy: {
      label: 'Hosted-by bar',
      fields: {
        label: { type: 'text', label: 'Small label' },
        hosts: {
          type: 'array',
          label: 'Brands',
          getItemSummary: (item) => item?.name || 'Brand',
          defaultItemProps: { name: 'Brand name', monogram: 'ABC', logo: null, href: '' },
          arrayFields: {
            name: { type: 'text', label: 'Name' },
            logo: imageField(
              'Logo',
              'Their own logo, as they supply it — symbol and wordmark together is normal and fine. Any shape works.',
            ),
            /**
             * Three options rather than a colour picker.
             *
             * The only question that actually comes up is "can this logo be seen
             * on a near-white bar", and it has three answers: yes, it needs a
             * white card because the file has its own white background, or it
             * needs a dark card because the logo is white. A colour picker would
             * invite a fourth brand colour onto the page.
             */
            logoBackground: {
              type: 'radio',
              label: 'Behind the logo',
              options: [
                { label: 'Nothing', value: 'none' },
                { label: 'White card', value: 'white' },
                { label: 'Dark card', value: 'dark' },
              ],
            },
            logoSize: {
              type: 'radio',
              label: 'Logo size',
              options: [
                { label: 'Smaller', value: 'small' },
                { label: 'Default', value: 'medium' },
                { label: 'Larger', value: 'large' },
              ],
            },
            showName: {
              type: 'radio',
              label: 'Brand name',
              options: [
                { label: 'Let the logo say it', value: false },
                { label: 'Print it beside the logo', value: true },
              ],
            },
            monogram: { type: 'text', label: 'Initials (used only until a logo is added)' },
            href: { type: 'text', label: 'Link (optional)' },
          },
        },
      },
      defaultProps: {
        label: 'Hosted by',
        hosts: [
          { name: 'Tiny 3D Temples', monogram: 'T3T', href: 'https://tiny3dtemples.com/' },
          { name: 'B.O.M.Socks', monogram: 'BOM', href: 'https://bomsocks.com/' },
          { name: 'Come Follow Me FHE', monogram: 'CFM', href: 'https://www.comefollowmefhe.com/' },
        ],
      },
      render: ({ label, hosts }) => (
        <div className="hostbar">
          <div className="hostbar-in">
            {label ? <p className="host-label">{label}</p> : null}
            <div className="hosts">
              {(hosts || []).map((host, i) => {
                const hasLogo = Boolean(host.logo?.url)
                /**
                 * A logo with a wordmark in it has already said the name, and
                 * printing it again in our typeface beside their own is the
                 * mistake this block used to make by default. Initials have not
                 * said it, so those still get the name.
                 */
                const showName = host.showName ?? !hasLogo
                const inner = (
                  <>
                    {hasLogo ? (
                      <span
                        className={[
                          'hostlogo',
                          host.logoSize && host.logoSize !== 'medium'
                            ? `hostlogo-${host.logoSize}`
                            : '',
                          host.logoBackground === 'white'
                            ? 'hostlogo-card'
                            : host.logoBackground === 'dark'
                              ? 'hostlogo-dark'
                              : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <BlockImage
                          image={host.logo}
                          fallbackAlt={host.name}
                          sizes="(max-width: 760px) 190px, 270px"
                        />
                      </span>
                    ) : host.monogram ? (
                      <span className="host-mark">{host.monogram}</span>
                    ) : null}
                    {showName ? <span className="host-name">{host.name}</span> : null}
                  </>
                )
                return host.href ? (
                  <a
                    key={i}
                    className="host"
                    href={toHref(host.href)}
                    target="_blank"
                    rel="noopener"
                    /**
                     * Named explicitly when the name is not on screen. The logo's
                     * alt text usually carries it, but alt is editable and a link
                     * whose only label is "logo" is a link nobody using a screen
                     * reader can follow on purpose.
                     */
                    {...(showName ? {} : { 'aria-label': host.name })}
                  >
                    {inner}
                  </a>
                ) : (
                  <span key={i} className="host">
                    {inner}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      ),
    },

    DarkCard: {
      label: 'Dark feature card',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        heading: { type: 'textarea', label: 'Heading' },
        body: { type: 'textarea', label: 'Body (blank line = new paragraph)' },
        kicker: { type: 'text', label: 'Closing line, emphasised' },
      },
      defaultProps: {
        eyebrow: 'Faith first, then strategy',
        heading: 'What if your Q4 wasn’t just built on strategy, but founded on faith first?',
        body: 'Q4 is the quarter that quietly eats December. The late-night inventory panic. The Sunday spent putting out fires.\n\nIt isn’t. The scramble comes from deciding in November what should have been decided in September.',
        kicker: 'Faith first. Family second. Then a Q4 that funds both.',
      },
      render: ({ eyebrow, heading, body, kicker }) => (
        <div className="slot">
          <div className="slot-in">
            <div className="card-dark">
              {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
              {heading ? <h2>{heading}</h2> : null}
              <Paragraphs text={body} />
              {kicker ? (
                <p>
                  <strong>{kicker}</strong>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ),
    },

    BulletList: {
      label: 'Bullet list',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        leadIn: { type: 'textarea', label: 'Lead-in line' },
        bullets: {
          type: 'array',
          label: 'Bullets',
          getItemSummary: (item) => item?.lead || 'Bullet',
          defaultItemProps: { lead: 'The thing', text: '— what it is and why it matters' },
          arrayFields: {
            lead: { type: 'text', label: 'Bold lead' },
            text: { type: 'textarea', label: 'Rest of the line' },
          },
        },
        ctaLabel: { type: 'text', label: 'Button text' },
        ctaHref: linkField,
        ctaMicro: { type: 'text', label: 'Small text beside the button' },
      },
      defaultProps: {
        eyebrow: 'What you’ll learn',
        leadIn: 'We build it together. You leave with a plan you can execute:',
        bullets: [
          { lead: 'Your promotional calendar', text: '— what to run, when to run it, and how the promotions build on each other' },
          { lead: 'Your offer strategy', text: '— bundles, tiered discounts, gifts with purchase, and ways to sell beyond “25% off”' },
          { lead: 'Your email + SMS roadmap', text: '— the campaigns and automated flows that support the quarter' },
        ],
        ctaLabel: 'Save my seat',
        ctaHref: '/register',
        ctaMicro: 'Thursday, September 10 · 11:00 AM MT',
      },
      render: ({ eyebrow, leadIn, bullets, ctaLabel, ctaHref, ctaMicro }) => (
        <div className="slot wash">
          <div className="slot-in">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {leadIn ? <p className="leadin">{leadIn}</p> : null}
            <ul className="bullets">
              {(bullets || []).map((b, i) => (
                <li key={i}>
                  <span className="b-t">
                    {b.lead ? <strong>{b.lead}</strong> : null} {b.text}
                  </span>
                </li>
              ))}
            </ul>
            {ctaLabel ? (
              <div className="cta-row cta-row-2">
                <Cta label={ctaLabel} href={ctaHref} />
                {ctaMicro ? <span className="cta-micro">{ctaMicro}</span> : null}
              </div>
            ) : null}
          </div>
        </div>
      ),
    },

    FormulaBar: {
      label: 'Formula bar',
      fields: {
        terms: {
          type: 'array',
          label: 'Terms (multiplied together)',
          getItemSummary: (item) => item?.term || 'Term',
          defaultItemProps: { term: 'Term' },
          arrayFields: { term: { type: 'text', label: 'Term' } },
        },
        result: { type: 'text', label: 'What it equals' },
        caption: { type: 'text', label: 'Caption under the bar' },
        note: { type: 'textarea', label: 'Note below (optional)' },
      },
      defaultProps: {
        terms: [{ term: 'Ads' }, { term: 'Offer' }, { term: 'Repeat' }],
        result: 'the CAC you can afford',
        caption: 'Each arm makes the other two cheaper',
      },
      render: ({ terms, result, caption, note }) => (
        <div className="slot">
          <div className="slot-in">
            <div className="fbar">
              <p className="formula">
                {(terms || []).map((t, i) => (
                  <span key={i}>
                    {i > 0 ? <span className="x">×</span> : null}
                    {t.term}
                  </span>
                ))}
                {result ? (
                  <span>
                    <span className="x">=</span>
                    {result}
                  </span>
                ) : null}
              </p>
              {caption ? <p className="fbar-note">{caption}</p> : null}
            </div>
            {note ? <p className="closer">{note}</p> : null}
          </div>
        </div>
      ),
    },

    CardRow: {
      label: 'Row of cards',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        heading: { type: 'textarea', label: 'Heading' },
        body: { type: 'textarea', label: 'Intro paragraph' },
        background: {
          type: 'radio',
          label: 'Background',
          options: [
            { label: 'White', value: 'white' },
            { label: 'Off-white', value: 'wash' },
          ],
        },
        cards: {
          type: 'array',
          label: 'Cards',
          getItemSummary: (item) => item?.title || 'Card',
          defaultItemProps: { title: 'Card title', body: 'What this card says.' },
          arrayFields: {
            title: { type: 'text', label: 'Title' },
            body: { type: 'textarea', label: 'Body' },
          },
        },
      },
      defaultProps: {
        eyebrow: 'Who this is for',
        heading: 'Built for founders running a real store and a real life.',
        body: 'If you’re selling online, carrying a calling, and trying to grow without letting Q4 take over your home, you’re in the right room.',
        background: 'wash',
        cards: [
          { title: 'A store, not a hobby', body: 'You have products shipping and traffic coming in. Q4 genuinely matters for your number.' },
          { title: 'Small team or solo', body: 'No CMO, no agency retainer. You’re the strategist, the copywriter, and the one placing the bets.' },
          { title: 'A calling and a family', body: 'Sundays aren’t workdays. Weeknights belong to your kids. Any Q4 plan worth building has to respect both.' },
        ],
      },
      render: ({ eyebrow, heading, body, cards, background }) => (
        <div className={background === 'wash' ? 'slot wash' : 'slot'}>
          <div className="slot-in">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {heading ? <h2>{heading}</h2> : null}
            <Paragraphs text={body} className="lede" />
            <div className={`cols-${Math.min(Math.max((cards || []).length, 1), 4)}`}>
              {(cards || []).map((card, i) => (
                <div className="card" key={i}>
                  {card.title ? <h3>{card.title}</h3> : null}
                  <Paragraphs text={card.body} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },

    Speakers: {
      label: 'Speakers',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        heading: { type: 'textarea', label: 'Heading' },
        ctaLabel: { type: 'text', label: 'Button text' },
        ctaHref: linkField,
        ctaMicro: { type: 'text', label: 'Small text beside the button' },
        people: {
          type: 'array',
          label: 'People',
          getItemSummary: (item) => item?.name || 'Person',
          defaultItemProps: { label: 'Presenter', name: 'Full name', title: 'What they do', monogram: 'AB', photo: null, body: 'A sentence about them.' },
          arrayFields: {
            label: { type: 'text', label: 'Role label' },
            name: { type: 'text', label: 'Name' },
            title: { type: 'text', label: 'Title' },
            monogram: { type: 'text', label: 'Initials (shown when there is no photo)' },
            photo: imageField('Photo'),
            body: { type: 'textarea', label: 'Bio (blank line = new paragraph)' },
          },
        },
      },
      defaultProps: {
        eyebrow: 'Who you’re learning from',
        heading: 'Live with David Love and special guest Derek Crimin',
        people: [
          { label: 'Presenter', name: 'David Love', title: 'E-commerce growth strategist', monogram: 'DL', body: 'David spends his days on the unglamorous side of e-commerce growth — offer strategy, email and SMS, paid social, and the conversion work that turns existing traffic into more orders.' },
          { label: 'Special guest', name: 'Derek Crimin', title: 'Owner, B.O.M.Socks', monogram: 'DC', body: 'Derek owns and operates B.O.M.Socks, so he walks into Q4 as an operator rather than a theorist — same inventory calls, same ad costs, same deadline you’re working against.' },
        ],
      },
      render: ({ eyebrow, heading, people, ctaLabel, ctaHref, ctaMicro }) => (
        <div className="slot wash">
          <div className="slot-in">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {heading ? <h2>{heading}</h2> : null}
            <div className="speakers">
              {(people || []).map((person, i) => (
                <div className="speaker" key={i}>
                  {person.label ? <p className="sp-tag">{person.label}</p> : null}
                  <div className="sp-top">
                    {person.photo?.url ? (
                      <span className="sp-photo">
                        <BlockImage
                          image={person.photo}
                          fallbackAlt={person.name || ''}
                          sizes="132px"
                        />
                      </span>
                    ) : person.monogram ? (
                      <span className="sp-photo" aria-hidden="true">
                        {person.monogram}
                      </span>
                    ) : null}
                    <div>
                      {person.name ? <p className="sp-name">{person.name}</p> : null}
                      {person.title ? <p className="sp-role">{person.title}</p> : null}
                    </div>
                  </div>
                  <Paragraphs text={person.body} />
                </div>
              ))}
            </div>
            {/* The original page carried a CTA here, between the speakers and
                the final card. It was the one thing the extraction dropped. */}
            {ctaLabel && ctaHref ? (
              <div className="cta-row cta-row-2">
                <Cta label={ctaLabel} href={ctaHref} />
                {ctaMicro ? <span className="cta-micro">{ctaMicro}</span> : null}
              </div>
            ) : null}
          </div>
        </div>
      ),
    },

    CtaCard: {
      label: 'Call to action card',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        heading: { type: 'textarea', label: 'Heading' },
        body: { type: 'textarea', label: 'Paragraph above the button' },
        ctaLabel: { type: 'text', label: 'Button text' },
        ctaHref: linkField,
        note: { type: 'text', label: 'Small print under the button' },
      },
      defaultProps: {
        eyebrow: 'Thursday, September 10 · 11:00 AM MT · free · 90 minutes',
        heading: 'Your Q4 Revenue Playbook, Built in 90 Minutes.',
        body: 'Two fields and you’re in. We’ll send the join link straight away, a reminder before we start, and the replay afterwards either way.',
        ctaLabel: 'Save my seat',
        ctaHref: '/register',
        note: 'Free · no card required · replay sent to every registrant',
      },
      render: ({ eyebrow, heading, body, ctaLabel, ctaHref, note }) => (
        <div className="final-in">
          <div className="finalcard">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {heading ? <h2>{heading}</h2> : null}
            {body ? <p className="final-lead">{body}</p> : null}
            <Cta label={ctaLabel} href={ctaHref} large />
            {note ? <p className="formnote">{note}</p> : null}
          </div>
        </div>
      ),
    },

    /**
     * The top of an interior page: privacy, terms, anything that is a document
     * rather than a pitch.
     *
     * Separate from Hero because a hero is a sales unit — badge, deck, CTA — and
     * separate from Prose because Prose renders an h2. A legal page needs one h1
     * and a "last updated" line, and nothing else at the top.
     */
    PageHeading: {
      label: 'Page title',
      fields: {
        eyebrow: { type: 'text', label: 'Small label above' },
        heading: { type: 'textarea', label: 'Page title (the h1)' },
        body: { type: 'textarea', label: 'Line underneath — e.g. last updated' },
      },
      defaultProps: {
        eyebrow: 'eCommHarvest',
        heading: 'Page title',
        body: 'Last updated 22 August 2026',
      },
      render: ({ eyebrow, heading, body }) => (
        <div className="legalhead">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          {heading ? <h1>{heading}</h1> : null}
          {body ? <p className="updated">{body}</p> : null}
        </div>
      ),
    },

    /**
     * One numbered section of a document — a privacy clause, a term.
     *
     * Distinct from Prose because the typography is different work: Prose sets
     * paragraphs as `.lede`, which is the large muted voice of a landing page
     * and unreadable for ten sections of legal text. This renders body copy at
     * document size, and takes an optional list, so one block holds one whole
     * clause rather than scattering a section across three.
     */
    LegalText: {
      label: 'Document section',
      fields: {
        heading: { type: 'textarea', label: 'Section heading' },
        body: {
          type: 'textarea',
          label: 'Text — new line for a new paragraph, start a line with "- " for a bullet',
        },
      },
      defaultProps: {
        heading: 'Section heading',
        body: 'What this section says.\n- A bullet, if the clause needs a list\n- Another one',
      },
      render: ({ heading, body }) => (
        <div className="legalblock">
          {heading ? <h2>{heading}</h2> : null}
          <DocumentBody text={body} />
        </div>
      ),
    },

    Prose: {
      label: 'Heading and text',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        heading: { type: 'textarea', label: 'Heading' },
        body: { type: 'textarea', label: 'Body (blank line = new paragraph)' },
        background: {
          type: 'radio',
          label: 'Background',
          options: [
            { label: 'White', value: 'white' },
            { label: 'Off-white', value: 'wash' },
          ],
        },
      },
      defaultProps: {
        eyebrow: 'Section label',
        heading: 'A heading that says what this section is about.',
        body: 'Your copy here. Leave a blank line between paragraphs and each one gets its own.',
        background: 'white',
      },
      render: ({ eyebrow, heading, body, background }) => (
        <div className={background === 'wash' ? 'slot wash' : 'slot'}>
          <div className="slot-in">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {heading ? <h2>{heading}</h2> : null}
            <Paragraphs text={body} className="lede" />
          </div>
        </div>
      ),
    },

    PostList: {
      label: 'Latest from the blog',
      fields: {
        eyebrow: { type: 'text', label: 'Small label' },
        heading: { type: 'text', label: 'Heading' },
        body: { type: 'textarea', label: 'Line underneath' },
        count: {
          type: 'radio',
          label: 'How many',
          options: [
            { label: 'Two', value: 2 },
            { label: 'Three', value: 3 },
            { label: 'Four', value: 4 },
          ],
        },
        ctaLabel: { type: 'text', label: 'Link to the blog (blank for none)' },
      },
      defaultProps: {
        eyebrow: 'From the blog',
        heading: 'Read while you plan.',
        body: 'Short, practical pieces on the things that decide a quarter.',
        count: 3,
        ctaLabel: 'All posts',
      },
      /**
       * The posts arrive as Puck metadata, exactly like the site logo.
       *
       * A block's render is synchronous and cannot query the database, so
       * whoever renders the page fetches them — see `siteMetadata()`. The block
       * shows nothing at all when there are no posts, rather than a heading over
       * an empty space: a section promising writing and delivering none is worse
       * than no section. (An empty fragment, not null — Puck's renders must
       * return an element.)
       */
      render: ({ eyebrow, heading, body, count, ctaLabel, puck }) => {
        const meta = puck?.metadata as { recentPosts?: RecentPost[] } | undefined
        const posts = (meta?.recentPosts || []).slice(0, count || 3)
        if (posts.length === 0) return <></>
        return (
          <section className="slot wash">
            <div className="slot-in">
              {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
              {heading ? <h2>{heading}</h2> : null}
              {body ? <p className="lede">{body}</p> : null}
              <div className="postcards">
                {posts.map((post, i) => (
                  <article key={i} className="postcard">
                    <a className="postcard-link" href={post.href}>
                      {post.coverUrl ? (
                        <span className="postcard-cover">
                          <BlockImage
                            image={{
                              url: post.coverUrl,
                              alt: post.title,
                              width: post.coverWidth,
                              height: post.coverHeight,
                            }}
                            sizes="(max-width: 760px) 100vw, 380px"
                          />
                        </span>
                      ) : null}
                      <span className="postcard-body">
                        <h3 className="postcard-title">{post.title}</h3>
                        {post.excerpt ? (
                          <span className="postcard-excerpt">{post.excerpt}</span>
                        ) : null}
                      </span>
                    </a>
                  </article>
                ))}
              </div>
              {ctaLabel ? (
                <p style={{ marginTop: 26 }}>
                  <a className="backlink" href="/blog">
                    {ctaLabel} &rarr;
                  </a>
                </p>
              ) : null}
            </div>
          </section>
        )
      },
    },

    Footer: {
      label: 'Footer',
      fields: {
        copyright: { type: 'text', label: 'Left-hand text' },
        links: {
          type: 'array',
          label: 'Links',
          getItemSummary: (item) => item?.label || 'Link',
          defaultItemProps: { label: 'Privacy Policy', href: '/privacy' },
          arrayFields: {
            label: { type: 'text', label: 'Label' },
            href: { type: 'text', label: 'Link' },
          },
        },
        note: { type: 'text', label: 'Right-hand text' },
      },
      defaultProps: {
        copyright: '© 2026 eCommHarvest',
        links: [
          { label: 'Privacy Policy', href: '/privacy' },
          { label: 'Terms & Conditions', href: '/terms' },
        ],
        note: 'Hosted by Tiny 3D Temples · B.O.M.Socks · Come Follow Me FHE',
      },
      render: ({ copyright, links, note }) => (
        <footer>
          <div className="foot-in">
            <span>{copyright}</span>
            <nav className="foot-nav">
              {(links || []).map((link, i) => (
                <a key={i} href={toHref(link.href)}>
                  {link.label}
                </a>
              ))}
            </nav>
            <span>{note}</span>
          </div>
        </footer>
      ),
    },
  },
}

/**
 * A page layout, typed to this block library.
 *
 * Worth its own name: Puck's bare `Data` is typed against a default,
 * unconstrained component map, so passing it to `<Render config={config}>`
 * fails to type-check. Layouts arrive from the database as untyped JSON, so
 * this is the one place the shape is asserted — and asserting it here means
 * `p/[slug]` can check `Array.isArray(data.content)` at runtime rather than
 * trusting the cast.
 */
export type PageData = Data<Blocks>

/**
 * One block, with its default props baked in.
 *
 * The props must be spread in here rather than left to Puck. Puck merges
 * `defaultProps` when it *renders* a block in the editor, but the editor's state
 * — the thing that gets saved — keeps whatever it was given. So a starter block
 * written as `{ type: 'Hero', props: { id } }` looked completely right on the
 * canvas and saved an empty block, and the public page rendered a hero with no
 * words in it. Caught by test/builder.ui.mjs, which drives the real editor;
 * neither type-checking nor an HTTP test could see it.
 */
const withDefaults = <T extends keyof Blocks>(type: T, id: string) => ({
  type,
  props: { id, ...(config.components[type].defaultProps ?? {}) },
})

/**
 * What a brand-new page starts as, rather than an empty canvas.
 *
 * A blank builder is the moment people give up on a builder. This is a working
 * page — hero, hosts, CTA, footer — that can be edited down to whatever is
 * actually wanted.
 */
export const starterContent = [
  withDefaults('Hero', 'starter-hero'),
  withDefaults('HostedBy', 'starter-hosts'),
  withDefaults('CtaCard', 'starter-cta'),
  withDefaults('Footer', 'starter-footer'),
]
