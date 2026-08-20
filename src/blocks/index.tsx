import type { Config, Data } from '@measured/puck'
import React from 'react'

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
  if (!label || !href) return null
  const external = /^https?:\/\//.test(href)
  return (
    <a
      className={large ? 'btn btn-lg' : 'btn'}
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener' } : {})}
    >
      {label}
    </a>
  )
}

const linkField = {
  type: 'text' as const,
  label: 'Button link',
  placeholder: 'https://ecommharvest.com/register',
}

// --- the blocks ---------------------------------------------------------

export type Blocks = {
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
    hosts?: { name: string; monogram?: string; logoUrl?: string; href?: string }[]
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
    people?: { label?: string; name?: string; title?: string; monogram?: string; body?: string }[]
  }
  CtaCard: {
    eyebrow?: string
    heading?: string
    body?: string
    ctaLabel?: string
    ctaHref?: string
    note?: string
  }
  Prose: { eyebrow?: string; heading?: string; body?: string; background?: 'white' | 'wash' }
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
    'Top of page': { title: 'Top of page', components: ['Hero', 'HostedBy'], defaultExpanded: true },
    Body: {
      title: 'Body sections',
      components: ['DarkCard', 'BulletList', 'FormulaBar', 'CardRow', 'Speakers', 'Prose'],
      defaultExpanded: true,
    },
    'Bottom of page': { title: 'Bottom of page', components: ['CtaCard', 'Footer'] },
  },
  components: {
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
        when: 'Thursday, September 3 · 11:00 AM MT',
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
          defaultItemProps: { name: 'Brand name', monogram: 'ABC', logoUrl: '', href: '' },
          arrayFields: {
            name: { type: 'text', label: 'Name' },
            monogram: { type: 'text', label: 'Initials (shown when there is no logo)' },
            logoUrl: { type: 'text', label: 'Logo image URL (optional)' },
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
                const inner = (
                  <>
                    <span className={`host-mark${host.logoUrl ? ' host-mark-plate' : ''}`}>
                      {host.logoUrl ? <img src={host.logoUrl} alt={host.name} /> : host.monogram}
                    </span>
                    <span className="host-name">{host.name}</span>
                  </>
                )
                return host.href ? (
                  <a key={i} className="host" href={host.href} target="_blank" rel="noopener">
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
        ctaMicro: 'Thursday, September 3 · 11:00 AM MT',
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
        people: {
          type: 'array',
          label: 'People',
          getItemSummary: (item) => item?.name || 'Person',
          defaultItemProps: { label: 'Presenter', name: 'Full name', title: 'What they do', monogram: 'AB', body: 'A sentence about them.' },
          arrayFields: {
            label: { type: 'text', label: 'Role label' },
            name: { type: 'text', label: 'Name' },
            title: { type: 'text', label: 'Title' },
            monogram: { type: 'text', label: 'Initials' },
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
      render: ({ eyebrow, heading, people }) => (
        <div className="slot wash">
          <div className="slot-in">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {heading ? <h2>{heading}</h2> : null}
            <div className="speakers">
              {(people || []).map((person, i) => (
                <div className="speaker" key={i}>
                  {person.label ? <p className="sp-tag">{person.label}</p> : null}
                  <div className="sp-top">
                    {person.monogram ? (
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
        eyebrow: 'Thursday, September 3 · 11:00 AM MT · free · 90 minutes',
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
                <a key={i} href={link.href}>
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
