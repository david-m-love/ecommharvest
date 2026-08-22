/**
 * One-time tool: turns the existing hand-built pages into page-builder layouts.
 *
 *   node scripts/extract-pages.mjs
 *
 * Writes src/seed/home.json and src/seed/masterclass.json, which the migration
 * in src/migrations/ inserts as published Pages. After that the builder owns the
 * content and this script is history — it exists so the first version of each
 * page is the real page, not a retyped approximation of it.
 *
 * Why a browser rather than a regex: the source is real HTML with entities,
 * nested spans and eight-item lists. Walking the DOM gets the text exactly right,
 * including the curly quotes and em dashes, where a regex would quietly mangle
 * one string in twenty and nobody would notice until it was published.
 *
 * Run it against ghl/blocks/*.html, which is generated from ghl/src/ — so this
 * reads the same markup that gets pasted into GoHighLevel.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const outDir = join(root, 'src', 'seed')
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
)

/** Loads a generated block file into a page so it can be queried as a DOM. */
const open = async (...files) => {
  const html = files.map((f) => readFileSync(join(root, 'ghl', 'blocks', f), 'utf8')).join('\n')
  const page = await browser.newPage()
  await page.setContent(`<!doctype html><html><body>${html}</body></html>`, {
    waitUntil: 'domcontentloaded',
  })
  return page
}

/**
 * The extraction, run inside the page.
 *
 * Returns Puck content: an ordered list of `{ type, props }`. Ids are assigned
 * here and must be stable and unique within a page — Puck uses them as React
 * keys and as the selection target in the editor.
 */
const EXTRACT = () => {
  const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : undefined)
  const blocks = []
  let n = 0
  const push = (type, props) => {
    // Drop undefined so the stored JSON contains only real values, and a field
    // left empty in the source stays empty in the builder rather than arriving
    // as the string "undefined".
    const clean = {}
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === '') continue
      if (Array.isArray(v) && v.length === 0) continue
      clean[k] = v
    }
    blocks.push({ type, props: { id: `seed-${type.toLowerCase()}-${n++}`, ...clean } })
  }

  // --- header -----------------------------------------------------------
  const topbar = document.querySelector('.ech-topbar')
  if (topbar) {
    const img = topbar.querySelector('.ech-brand img')
    push('Header', {
      // The logo is a data: URI in the generated block. Deliberately not carried
      // over: it would bloat every page row and cannot be swapped from the
      // admin. The Header falls back to the name until a logo is picked from the
      // media library, which is the thing David asked to be able to do.
      logoText: img?.getAttribute('alt') || 'eCommHarvest',
      homeUrl: topbar.querySelector('.ech-brand')?.getAttribute('href') || undefined,
      rightText: t(topbar.querySelector('.ech-stamp')),
    })
  }

  // --- hero -------------------------------------------------------------
  const hero = document.querySelector('.ech-slot.ech-hero')
  if (hero) {
    const cta = hero.querySelector('.ech-cta-row .ech-btn')
    push('Hero', {
      eyebrow: t(hero.querySelector('.ech-badge')),
      heading: t(hero.querySelector('h1')),
      deck: t(hero.querySelector('.ech-deck')),
      body: [...hero.querySelectorAll('.ech-lede')].map(t).join('\n\n'),
      when: t(hero.querySelector('.ech-when')),
      ctaLabel: t(cta),
      ctaHref: cta?.getAttribute('href') || undefined,
      ctaMicro: t(hero.querySelector('.ech-cta-micro')),
    })
  }

  // --- hosted-by --------------------------------------------------------
  const hostbar = document.querySelector('.ech-hostbar')
  if (hostbar) {
    push('HostedBy', {
      label: t(hostbar.querySelector('.ech-host-label')),
      hosts: [...hostbar.querySelectorAll('.ech-host')].map((h) => ({
        name: t(h.querySelector('.ech-host-name')),
        /**
         * The generated block embeds B.O.M.Socks' logo by URL, which cannot be
         * swapped from the admin — so images are dropped and the logo gets
         * re-picked from the media library. Falling back to initials derived
         * from the name rather than to nothing, otherwise that host renders as
         * an empty circle until someone notices.
         */
        monogram: h.querySelector('.ech-host-mark img')
          ? (t(h.querySelector('.ech-host-name')) || '')
              .replace(/[^A-Za-z0-9]/g, '')
              .slice(0, 3)
              .toUpperCase()
          : t(h.querySelector('.ech-host-mark')),
        href: h.getAttribute('href') || undefined,
      })),
    })
  }

  // --- every remaining section, in document order -----------------------
  for (const slot of document.querySelectorAll('.ech-slot:not(.ech-hero), .ech-final-in')) {
    const wash = slot.classList.contains('ech-wash') ? 'wash' : 'white'

    const dark = slot.querySelector('.ech-card-dark')
    if (dark) {
      const paras = [...dark.querySelectorAll('p:not(.ech-eyebrow)')]
      const kicker = paras.at(-1)?.querySelector('strong') ? paras.pop() : null
      push('DarkCard', {
        eyebrow: t(dark.querySelector('.ech-eyebrow')),
        heading: t(dark.querySelector('h2')),
        body: paras.map(t).join('\n\n'),
        kicker: t(kicker),
      })
      continue
    }

    const bullets = slot.querySelector('.ech-bullets')
    if (bullets) {
      const cta = slot.querySelector('.ech-cta-row .ech-btn')
      push('BulletList', {
        eyebrow: t(slot.querySelector('.ech-eyebrow')),
        leadIn: t(slot.querySelector('.ech-leadin')),
        bullets: [...bullets.querySelectorAll('li')].map((li) => {
          const lead = t(li.querySelector('strong'))
          const whole = t(li)
          return { lead, text: lead && whole?.startsWith(lead) ? whole.slice(lead.length).trim() : whole }
        }),
        ctaLabel: t(cta),
        ctaHref: cta?.getAttribute('href') || undefined,
        ctaMicro: t(slot.querySelector('.ech-cta-micro')),
      })
      continue
    }

    const finalcard = slot.querySelector('.ech-finalcard')
    if (finalcard) {
      const cta = finalcard.querySelector('.ech-btn')
      push('CtaCard', {
        eyebrow: t(finalcard.querySelector('.ech-eyebrow')),
        heading: t(finalcard.querySelector('h2')),
        body: t(finalcard.querySelector('.ech-final-lead')),
        ctaLabel: t(cta),
        ctaHref: cta?.getAttribute('href') || undefined,
        note: t(finalcard.querySelector('.ech-formnote')),
      })
      continue
    }

    const speakers = slot.querySelector('.ech-speakers')
    if (speakers) {
      /**
       * The CTA row after the speaker grid was dropped by the first version of
       * this extractor, which is how the builder page ended up with three
       * "Save my seat" buttons where the original had four.
       */
      const speakerCta = slot.querySelector('.ech-cta-row-2')
      push('Speakers', {
        eyebrow: t(slot.querySelector('.ech-eyebrow')),
        heading: t(slot.querySelector('h2')),
        ctaLabel: t(speakerCta?.querySelector('.ech-btn')),
        ctaHref: speakerCta?.querySelector('.ech-btn')?.getAttribute('href') || undefined,
        ctaMicro: t(speakerCta?.querySelector('.ech-cta-micro')),
        people: [...speakers.querySelectorAll('.ech-speaker')].map((s) => ({
          label: t(s.querySelector('.ech-sp-tag')),
          name: t(s.querySelector('.ech-sp-name')),
          title: t(s.querySelector('.ech-sp-role')),
          monogram: t(s.querySelector('.ech-sp-photo')),
          body: [...s.querySelectorAll('p:not(.ech-sp-tag):not(.ech-sp-name):not(.ech-sp-role)')]
            .map(t)
            .filter(Boolean)
            .join('\n\n'),
        })),
      })
      continue
    }

    /**
     * A section with a formula bar is three blocks, not one: the heading and
     * intro, then the bar, then the cards. The hand-built page had them in one
     * <div>; the builder needs them separable so any of the three can be moved
     * or removed on its own.
     */
    const fbar = slot.querySelector('.ech-fbar')
    const cols = slot.querySelector('[class*="ech-cols-"]')
    const eyebrow = t(slot.querySelector('.ech-eyebrow'))
    const heading = t(slot.querySelector('h2'))
    const lede = [...slot.querySelectorAll(':scope > * > .ech-lede')].map(t).join('\n\n')

    if (fbar) {
      push('Prose', { eyebrow, heading, body: lede, background: wash })
      const formula = fbar.querySelector('.ech-formula')
      const parts = t(formula)
        ?.split('×')
        .map((s) => s.trim())
        .filter(Boolean)
      const last = parts?.at(-1)?.split('=')
      push('FormulaBar', {
        terms: [...(parts?.slice(0, -1) || []), last?.[0]?.trim()].filter(Boolean).map((term) => ({ term })),
        result: last?.[1]?.trim(),
        caption: t(fbar.querySelector('.ech-fbar-note')),
        note: t(slot.querySelector('.ech-closer')),
      })
      if (cols) {
        push('CardRow', {
          background: wash,
          cards: [...cols.querySelectorAll('.ech-card')].map((c) => ({
            title: t(c.querySelector('h3')),
            body: [...c.querySelectorAll('p')].map(t).filter(Boolean).join('\n\n'),
          })),
        })
      }
      continue
    }

    if (cols) {
      push('CardRow', {
        eyebrow,
        heading,
        body: lede,
        background: wash,
        cards: [...cols.querySelectorAll('.ech-card')].map((c) => ({
          title: t(c.querySelector('h3')),
          body: [...c.querySelectorAll('p')].map(t).filter(Boolean).join('\n\n'),
        })),
      })
      continue
    }

    // Anything else with words in it becomes a plain heading-and-text section.
    if (heading || lede) push('Prose', { eyebrow, heading, body: lede, background: wash })
  }

  // --- footer -----------------------------------------------------------
  const foot = document.querySelector('.ech-foot-in')
  if (foot) {
    const spans = [...foot.querySelectorAll(':scope > span')]
    push('Footer', {
      copyright: t(spans[0]),
      links: [...foot.querySelectorAll('.ech-foot-nav a')].map((a) => ({
        label: t(a),
        href: a.getAttribute('href'),
      })),
      note: t(spans.at(-1)),
    })
  }

  return { root: {}, content: blocks }
}

/**
 * The legal pages, read from the running app rather than from a file.
 *
 * They were built as React components, so there is no HTML on disk to walk.
 * `next dev` will render them, and the DOM is the same DOM — which is the point
 * of extracting rather than retyping: the words that go into the builder are
 * exactly the words that were reviewed, down to the punctuation.
 */
const openUrl = async (url) => {
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'load' })
  return page
}

/**
 * A document page becomes: a title block, then one block per heading, carrying
 * that heading's paragraphs and list. Sectioning by heading is what makes it
 * editable — a clause can be reworded, reordered or removed on its own.
 */
const EXTRACT_LEGAL = ({ eyebrow }) => {
  const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : undefined)
  const root = document.querySelector('.legal')
  /**
   * Refuse to read a page that is already builder-served.
   *
   * These routes prefer the builder page and fall back to the hand-built
   * component, so once a page exists in the database this script would extract
   * its own previous output — and any field the blocks no longer render would
   * silently disappear on the round trip. That happened: a run against a
   * builder-served page dropped every list on the privacy policy. The
   * hand-built version is the one with the "back to the masterclass" link.
   */
  if (!root || !document.querySelector('.backlink')) {
    throw new Error(
      'this page is being served by the page builder, not the hand-built component — ' +
        'delete the privacy/terms rows (or use a database without them) and run again',
    )
  }
  const content = []
  let n = 0

  content.push({
    type: 'PageHeading',
    props: {
      id: `seed-pageheading-${n++}`,
      eyebrow,
      heading: t(root.querySelector('h1')),
      body: t(root.querySelector('.updated')),
    },
  })

  /**
   * Everything between the "last updated" line and the first heading.
   *
   * On the privacy page that is three paragraphs including the "draft for
   * review, not checked by a lawyer" notice and the operating-entity statement —
   * the two passages it would be worst to lose. The first version of this
   * extractor started at the first h2 and dropped them silently.
   */
  const intro = []
  const firstH2 = root.querySelector('h2')
  const startAfter = root.querySelector('.updated') || root.querySelector('h1')
  for (let el = startAfter?.nextElementSibling; el && el !== firstH2; el = el.nextElementSibling) {
    if (el.tagName === 'P') intro.push(t(el))
    else if (el.classList.contains('callout')) {
      for (const para of el.querySelectorAll('p')) intro.push(t(para))
    }
  }
  if (intro.filter(Boolean).length) {
    content.push({
      type: 'LegalText',
      props: { id: `seed-legaltext-${n++}`, body: intro.filter(Boolean).join('\n') },
    })
  }

  for (const h2 of root.querySelectorAll('h2')) {
    /**
     * In document order, because order is meaning: "the form asks for:" has to
     * be followed by the list, not by the two paragraphs that came after it.
     * Bullets are written as "- item" lines in the same field, which is how the
     * block stores them.
     */
    const lines = []
    for (let el = h2.nextElementSibling; el && el.tagName !== 'H2'; el = el.nextElementSibling) {
      if (el.tagName === 'P') lines.push(t(el))
      else if (el.tagName === 'UL' || el.tagName === 'OL') {
        for (const li of el.querySelectorAll('li')) lines.push(`- ${t(li)}`)
      } else if (el.classList.contains('callout')) {
        // A callout is a paragraph with emphasis in the source. Kept as text:
        // the builder has no callout block, and inventing one to carry two
        // sentences is not worth a new concept in the block library.
        for (const para of el.querySelectorAll('p')) lines.push(t(para))
      }
    }
    content.push({
      type: 'LegalText',
      props: {
        id: `seed-legaltext-${n++}`,
        heading: t(h2),
        body: lines.filter(Boolean).join('\n'),
      },
    })
  }

  content.push({
    type: 'Footer',
    props: {
      id: `seed-footer-${n++}`,
      copyright: '© 2026 eCommHarvest',
      links: [
        { label: 'Masterclass', href: 'https://go.ecommharvest.com/masterclass' },
        { label: 'Privacy Policy', href: 'https://ecommharvest.com/privacy' },
        { label: 'Terms & Conditions', href: 'https://ecommharvest.com/terms' },
      ],
    },
  })

  return { root: {}, content }
}

const LEGAL_PAGES = [
  { file: 'privacy.json', title: 'Privacy', path: '/privacy', eyebrow: 'Legal' },
  { file: 'terms.json', title: 'Terms', path: '/terms', eyebrow: 'Legal' },
]

const PAGES = [
  { file: 'masterclass.json', title: 'Masterclass', sources: ['LANDING-PAGE.html'] },
  { file: 'home.json', title: 'Home', sources: ['home-1-WITH-CSS.html', 'home-2-cta.html'] },
]

for (const { file, title, sources } of PAGES) {
  const page = await open(...sources)
  const data = await page.evaluate(EXTRACT)
  await page.close()
  writeFileSync(join(outDir, file), JSON.stringify(data, null, 2) + '\n')
  console.log(`${title.padEnd(12)} ${data.content.length} blocks -> src/seed/${file}`)
  for (const b of data.content) {
    const summary = b.props.heading || b.props.logoText || b.props.label || b.props.copyright || ''
    console.log(`   ${b.type.padEnd(12)} ${String(summary).slice(0, 62)}`)
  }
}

/**
 * The header block is prepended rather than extracted: the hand-built legal
 * pages have a "back to site" link instead of the site header, and every
 * builder page should carry the same top bar as the rest of the site.
 */
const BASE = process.env.EXTRACT_BASE_URL || 'http://localhost:3000'
for (const { file, title, path, eyebrow } of LEGAL_PAGES) {
  const page = await openUrl(`${BASE}${path}`)
  const data = await page.evaluate(EXTRACT_LEGAL, { eyebrow })
  await page.close()
  data.content.unshift({
    type: 'Header',
    props: {
      id: 'seed-header-legal',
      logoText: 'eCommHarvest',
      homeUrl: 'https://ecommharvest.com/',
      rightText: '',
    },
  })
  writeFileSync(join(outDir, file), JSON.stringify(data, null, 2) + '\n')
  console.log(`${title.padEnd(12)} ${data.content.length} blocks -> src/seed/${file}`)
  for (const b of data.content) {
    console.log(`   ${b.type.padEnd(12)} ${String(b.props.heading || b.props.logoText || b.props.copyright || '').slice(0, 62)}`)
  }
}

await browser.close()
