/**
 * Builds proof/artifact.html — the landing page as a shareable proof link.
 *
 *   node ghl/build.mjs && node proof/artifact.mjs
 *
 * Same block that goes into GoHighLevel. Three deviations, every one forced by
 * the host rather than chosen, and every one called out on the page itself:
 *
 *   1. The host's CSP blocks external images, so the B.O.M.Socks logo would show
 *      as a broken-image icon. It falls back to the monogram the other two hosts
 *      already use.
 *   2. Funnel step 2 does not exist here, so the CTAs scroll to the final card
 *      rather than 404.
 *   3. Same for the brand link and the two footer legal links.
 *
 * Nothing about the design is touched. If a deviation ever stops being needed,
 * delete it here — never by hand-editing the output.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
let page = readFileSync(join(here, '..', 'ghl', 'blocks', 'LANDING-PAGE.html'), 'utf8')

const before = page
page = page.replace(
  /<span class="ech-host-mark ech-host-mark-plate"><img src="https:\/\/bomsocks\.com[^>]*><\/span>/,
  '<span class="ech-host-mark" aria-hidden="true">BOM</span>',
)
if (page === before) throw new Error('B.O.M.Socks logo markup not found — check the block')

page = page
  .replace(/href="\/register"/g, 'href="#register"')
  .replace(/href="\/"/g, 'href="#"')
  .replace(/href="\/(privacy|terms)"/g, 'href="#"')

const strip = `<div class="proof-strip">
  <strong>Proof</strong>
  <span>Funnel step 1 &middot; two placeholders on this host only: the B.O.M.Socks logo shows as
  <code>BOM</code> because external images are blocked here, and &ldquo;Save my seat&rdquo; scrolls down
  instead of going to the registration step. Both are correct on the real page.</span>
</div>`

writeFileSync(
  join(here, 'artifact.html'),
  `<title>Q4 Revenue Playbook</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  /* A committed single-theme page: this is a brand identity with a fixed cream,
     navy and gold palette, so it does not follow the viewer's light/dark
     setting. Both values are painted explicitly rather than inherited, so the
     host's ground never shows through in either theme. */
  :root{--proof-ground:#FFFFFF;--proof-ink:#16324F;--proof-strip:#16324F;--proof-strip-ink:#A9BECF;--proof-strip-key:#C99132}
  body{margin:0;background:var(--proof-ground);color:var(--proof-ink)}

  /* Deliberately not in the page's own visual language — a proof note should
     read as an annotation on the work, not as part of it. */
  .proof-strip{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 12px;
    padding:11px 20px;background:var(--proof-strip);color:var(--proof-strip-ink);
    font:400 12.5px/1.5 "IBM Plex Mono",ui-monospace,monospace}
  .proof-strip strong{color:var(--proof-strip-key);font-weight:500;letter-spacing:.14em;text-transform:uppercase}
  .proof-strip span{max-width:88ch}
  .proof-strip code{font-family:inherit;color:var(--proof-strip-key)}
</style>

${strip}

${page}`,
)
console.log('wrote proof/artifact.html')
