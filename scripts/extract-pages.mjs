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
      push('Speakers', {
        eyebrow: t(slot.querySelector('.ech-eyebrow')),
        heading: t(slot.querySelector('h2')),
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

await browser.close()
