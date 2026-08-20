/**
 * Builds a static proof site from the GoHighLevel blocks.
 *
 *   node ghl/build.mjs && node proof/build.mjs      -> proof/dist/
 *
 * Why this exists: the pages that matter now live as GHL paste-blocks, which are
 * body fragments with the stylesheet inlined. To *proof* one in a browser — or on
 * Vercel, or on a phone — it needs a doctype, a head, and a font link around it.
 * That is all this does. There is no duplicate copy of the design here: every
 * page below is the same block David pastes into GoHighLevel, so what he approves
 * is what he ships.
 *
 * Deliberately zero dependencies and no build step beyond `node` — Vercel runs
 * this with the install step skipped (see vercel.json), so a proof deploy cannot
 * be broken by the parked Next.js app's dependencies or its need for a database.
 */

import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const blocks = join(here, '..', 'ghl', 'blocks')
const dist = join(here, 'dist')

rmSync(dist, { recursive: true, force: true })
mkdirSync(dist, { recursive: true })

const block = (name) => readFileSync(join(blocks, name), 'utf8')
const css = block('masterclass-styles.css')

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">`

/**
 * The blocks carry their own <style>, so pages built from them need no
 * stylesheet link. Pages built from scratch (the stubs below) get `css: true`.
 */
const shell = ({ title, description, body, noindex = false, css: withCss = false }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">${noindex ? '\n<meta name="robots" content="noindex">' : ''}
${FONTS}${withCss ? `\n<style>\n${css}\n</style>` : ''}
<style>body{margin:0;background:#FFFFFF}</style>
</head>
<body>
${body}
</body>
</html>
`

const page = (path, html) => {
  mkdirSync(join(dist, dirname(path)), { recursive: true })
  writeFileSync(join(dist, path), html)
  return path
}

const written = []

// --- the page being proofed ---------------------------------------------
//
// Byte-for-byte the block that goes into GoHighLevel. Served at /masterclass so
// the proof URL matches the real one.

written.push(
  page(
    'masterclass/index.html',
    shell({
      title: 'Your Q4 Revenue Playbook, Built in 90 Minutes &mdash; eCommHarvest',
      description:
        'Thursday, September 3 at 11:00 AM MT. A free 90-minute masterclass for LDS e-commerce founders. Build your Q4 promotional calendar, offers, email and SMS plan in one sitting &mdash; without headaches or sacrificing family time.',
      body: block('LANDING-PAGE.html'),
    }),
  ),
)

written.push(
  page(
    'thanks/index.html',
    shell({
      title: 'You&rsquo;re registered &mdash; Q4 Masterclass',
      description:
        'Your seat is saved for the Q4 Revenue Playbook masterclass on Thursday, September 3 at 11:00 AM MT.',
      body: block('thanks-WITH-CSS.html'),
      noindex: true,
    }),
  ),
)

// --- stubs, so nothing the page links to 404s during a proof -------------
//
// /register is GoHighLevel's job — the whole point of the three-step split. It
// exists here only so the CTA buttons can be clicked while proofing, and it says
// so on the page rather than pretending to be the real thing.

const stub = ({ heading, lead, points = [] }) => `
<div class="ech-scope">
  <div class="ech-slot ech-hero">
    <div class="ech-slot-in">
      <p class="ech-eyebrow"><a href="/masterclass" class="ech-plainlink">&larr; Back to the masterclass page</a></p>
      <h1>${heading}</h1>
      <p class="ech-lede">${lead}</p>
      ${points.length ? `<ul class="ech-bullets">${points.map((p) => `<li><span class="ech-b-t">${p}</span></li>`).join('')}</ul>` : ''}
    </div>
  </div>
</div>`

written.push(
  page(
    'register/index.html',
    shell({
      title: 'Save my seat &mdash; Q4 Masterclass',
      description: 'Registration placeholder for the proof deploy.',
      noindex: true,
      css: true,
      body: stub({
        heading: 'This is where GoHighLevel&rsquo;s form goes.',
        lead:
          'Funnel step 2. Nothing is built here on purpose &mdash; this page exists so the &ldquo;Save my seat&rdquo; buttons can be clicked while you proof the landing page.',
        points: [
          'First name, email, and <strong>phone</strong> &mdash; phone is required for SMS',
          'Email consent and SMS consent as <strong>two separate checkboxes</strong>',
          'Store URL, optional',
          'Submit button reads &ldquo;Save my seat&rdquo; and redirects to /thanks',
        ],
      }),
    }),
  ),
)

for (const [path, heading] of [
  ['privacy/index.html', 'Privacy Policy'],
  ['terms/index.html', 'Terms &amp; Conditions'],
]) {
  written.push(
    page(
      path,
      shell({
        title: `${heading} &mdash; eCommHarvest`,
        description: 'Placeholder for the proof deploy.',
        noindex: true,
        css: true,
        body: stub({
          heading,
          lead:
            'Not written yet. A draft exists in git and needs legal review before any ads run. This stub is here so the footer link does not 404 while you proof the page.',
        }),
      }),
    ),
  )
}

// --- root ----------------------------------------------------------------
//
// A meta refresh rather than a vercel.json redirect, so the proof site behaves
// the same opened from disk as it does deployed.

written.push(
  page(
    'index.html',
    `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>eCommHarvest</title>
<meta http-equiv="refresh" content="0; url=/masterclass">
<link rel="canonical" href="/masterclass">
</head>
<body><p><a href="/masterclass">Continue to the masterclass page</a></p></body>
</html>
`,
  ),
)

console.log('wrote proof/dist/:')
written.forEach((w) => console.log('  ' + w))
console.log('\nproof locally:  npx serve proof/dist   (or open proof/dist/masterclass/index.html)')
