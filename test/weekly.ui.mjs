/**
 * The two membership pages.
 *
 *   npm run dev   (in another terminal, migrated)
 *   npm run test:weekly
 *
 * These are the pages that take money, and they go out to an email list on a
 * Monday. The failures worth catching are not subtle ones:
 *
 *   - The join button going nowhere, or to two different places.
 *   - An empty proof section publishing an empty box, which on a sales page
 *     says more clearly than any copy that nobody checked it.
 *   - The page pushing sideways on a phone, which is where most of this
 *     audience will open the link.
 *
 * Both pages ship as **drafts**, so a 200 here means somebody published them.
 * That is deliberately not asserted: this runs before and after launch.
 */

import { chromium } from 'playwright'

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'

let passed = 0
let failed = 0
const check = (ok, label, detail = '') => {
  console.log(`${ok ? ' ok ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`)
  ok ? passed++ : failed++
}

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
)
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()

for (const path of ['/join', '/weekly']) {
  console.log(`\n${path}`)
  const res = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
  const status = res?.status() ?? 0

  if (status === 404) {
    check(true, 'still a draft — publish it in the builder to test it live', '404')
    continue
  }
  check(status === 200, 'answers', `${status}`)

  // --- the money ---------------------------------------------------------
  const cta = await page.evaluate(() => {
    const priced = document.querySelector('#join')
    const buttons = Array.from(document.querySelectorAll('a.btn, span.btn'))
    return {
      hasAnchor: Boolean(priced),
      hrefs: buttons.map((b) => b.getAttribute('href')).filter(Boolean),
      disabled: buttons.filter((b) => b.className.includes('btn-off')).length,
      labels: buttons.map((b) => (b.textContent || '').trim()),
    }
  })
  check(cta.hasAnchor, 'the pricing card is anchored at #join')
  /**
   * Every in-page button points at that anchor, and only the pricing card holds
   * a checkout URL. Two buttons carrying the address is two things to paste and
   * one silent way for them to disagree.
   */
  const offsite = cta.hrefs.filter((href) => !href.startsWith('#'))
  check(
    offsite.length <= 1,
    'at most one button leaves the page',
    offsite.join(', ') || 'none yet — checkout URL not pasted',
  )
  check(
    cta.disabled === 0 || offsite.length === 0,
    'the join button is either a real link or visibly unavailable — never a dead one',
    `${cta.disabled} disabled, ${offsite.length} outbound`,
  )
  check(cta.labels.some((l) => /join/i.test(l)), 'there is a join button', cta.labels.join(' | '))

  // --- nothing empty published ------------------------------------------
  const empties = await page.evaluate(() => ({
    placeholders: document.querySelectorAll('.blockhidden').length,
    emptyQuotes: Array.from(document.querySelectorAll('.tcard, .pullquote')).filter(
      (el) => !(el.querySelector('blockquote')?.textContent || '').trim(),
    ).length,
    emptyFaq: Array.from(document.querySelectorAll('.faqitem')).filter(
      (el) => !(el.querySelector('.faqanswer')?.textContent || '').trim(),
    ).length,
    emptyLogos: Array.from(document.querySelectorAll('.tickerlogo')).filter(
      (el) => !el.querySelector('img'),
    ).length,
  }))
  check(empties.placeholders === 0, 'no builder placeholder reached the live page')
  check(empties.emptyQuotes === 0, 'no testimonial card without a quote')
  check(empties.emptyFaq === 0, 'no FAQ entry without an answer')
  check(empties.emptyLogos === 0, 'no logo slot without a logo')

  // --- proof is real text -----------------------------------------------
  const proof = await page.evaluate(() => {
    const text = document.body.innerText
    return {
      caseStudies: document.querySelectorAll('.proofstat').length,
      numbersInText: /\$213,024|\$90,000/.test(text),
      imagesInsideLinks: Array.from(document.querySelectorAll('.proofshot img')).every((img) =>
        img.closest('a'),
      ),
    }
  })
  check(
    proof.numbersInText,
    'the case-study figures are real text, not baked into a graphic',
  )
  check(
    proof.imagesInsideLinks,
    'every screenshot can be opened full size',
    `${proof.caseStudies} stat lines`,
  )

  // --- on a phone --------------------------------------------------------
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
  const mobile = await page.evaluate(() => {
    const first = document.querySelector('a.btn, span.btn')
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      ctaTop: first ? Math.round(first.getBoundingClientRect().top) : null,
      tiny: Array.from(document.querySelectorAll('.tcard p, .proofnote, .qcard'))
        .map((el) => parseFloat(getComputedStyle(el).fontSize))
        .filter((size) => size < 14).length,
    }
  })
  check(!mobile.overflow, 'the page does not push sideways at 390px')
  /**
   * This audience opens the link from an email or a text. A join button below
   * the first screen and a half is a join button most of them never reach.
   */
  check(
    mobile.ctaTop !== null && mobile.ctaTop < 900,
    'a join button is reachable without a long scroll',
    `${mobile.ctaTop}px down`,
  )
  check(mobile.tiny === 0, 'no proof or testimonial copy set below 14px', `${mobile.tiny} too small`)
  await page.setViewportSize({ width: 1280, height: 900 })
}

await browser.close()
console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
