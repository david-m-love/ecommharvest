/**
 * Converts the eCommHarvest pages into GoHighLevel-ready blocks.
 *
 *   node ghl/build.mjs
 *
 * Why this exists: GHL has no page import. You paste body HTML into "Custom
 * JS/HTML" elements and put CSS in funnel settings. Pasting our stylesheet as-is
 * would be a disaster — it declares `*`, `html`, `body`, `a`, `p`, `h1`, `h2`,
 * `h3`, `footer` and 120 classes including `.btn`, `.card`, `.field`, `.badge`.
 * Those names collide with GHL's own builder output, so our CSS would restyle
 * GHL's buttons and form inputs on the page, and GHL's CSS would leak into ours.
 *
 * The conversion does two things, and both matter:
 *
 *   1. Prefix every class `ech-`. This protects OUR design from GHL's global
 *      rules — GHL's `.btn` can no longer touch our `.ech-btn`.
 *   2. Scope every selector under `.ech-scope`. This protects GHL from US, and
 *      raises specificity so GHL's bare `p {}` loses to our `.ech-scope p {}`.
 */

import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = (name) => readFileSync(join(here, 'src', name), 'utf8')
const out = (name, content) => {
  mkdirSync(join(here, 'blocks'), { recursive: true })
  writeFileSync(join(here, 'blocks', name), content)
  return `${name} (${(content.length / 1024).toFixed(1)}kb)`
}

const PREFIX = 'ech-'
const SCOPE = 'ech-scope'

/**
 * Where every "Save my seat" button points.
 *
 * There is no form on the landing page any more: registration is step 2 of the
 * funnel, built natively in GoHighLevel. So the buttons' whole job is to send
 * people forward.
 *
 * A root-relative path is deliberate — funnel steps are paths on the same
 * domain, so this keeps working on the preview domain, the custom domain, and
 * after a rename of step 1. Override if the step's path differs:
 *
 *   REGISTER_URL=/save-my-seat node ghl/build.mjs
 */
const REGISTER_URL = process.env.REGISTER_URL || '/register'

// Element selectors we rewrite as descendants of the scope. `html` and `body`
// have no meaningful equivalent inside a block, so they collapse onto the
// wrapper itself.
const ELEMENTS = [
  'h1', 'h2', 'h3', 'h4', 'p', 'a', 'ul', 'ol', 'li', 'footer', 'table',
  'thead', 'tbody', 'tr', 'th', 'td', 'strong', 'em', 'span', 'button',
  'input', 'label', 'form', 'img', 'iframe', 'aside', 'nav', 'header', 'main',
]

/** Every class name declared in the stylesheet, longest first so `.host-name` is rewritten before `.host`. */
const declaredClasses = (css) =>
  [...new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]))].sort(
    (a, b) => b.length - a.length,
  )

function convertCss(css) {
  const classes = declaredClasses(css)

  // Split into rule blocks so we only rewrite selectors, never declarations —
  // rewriting inside `{...}` would corrupt values like `url(...)` or `1px`.
  const parts = []
  let index = 0
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g
  let match

  // @media blocks contain nested rules, so handle them recursively.
  const atRuleRe = /@media[^{]+\{/g
  const mediaStarts = [...css.matchAll(atRuleRe)].map((m) => m.index)

  const rewriteSelector = (selectorList) => {
    return selectorList
      .split(',')
      .map((raw) => {
        // Peel off any leading comment: it belongs to the output verbatim, but
        // leaving it attached breaks every match below.
        const commentMatch = raw.match(/^([\s\S]*?\*\/\s*)/)
        const comment = commentMatch ? commentMatch[1] : ''
        let sel = raw.slice(comment.length).trim()
        if (!sel) return comment + sel
        // Keyframe percentages and `from`/`to` are not selectors.
        if (/^(\d+%|from|to)$/.test(sel)) return comment + sel

        // :root holds the custom properties; they must land on the wrapper.
        if (sel === ':root') return comment + `.${SCOPE}`
        if (sel === 'html' || sel === 'body') return comment + `.${SCOPE}`
        if (sel === '*') return comment + `.${SCOPE} *`

        // Prefix classes.
        for (const cls of classes) {
          sel = sel.replace(new RegExp(`\\.${cls}(?![\\w-])`, 'g'), `.${PREFIX}${cls}`)
        }

        // Prefix bare leading element selectors (`h1`, `footer p`, `a:hover`).
        const leading = sel.match(/^([a-z][a-z0-9]*)\b/)
        if (leading && ELEMENTS.includes(leading[1])) {
          sel = `.${SCOPE} ${sel}`
        } else if (sel.startsWith('.') || sel.startsWith('#') || sel.startsWith('[')) {
          sel = `.${SCOPE} ${sel}`
        }
        return comment + sel
      })
      .join(', ')
  }

  // Walk the stylesheet, tracking @media nesting depth.
  let result = ''
  let i = 0
  while (i < css.length) {
    const at = css.indexOf('@media', i)
    const nextRule = css.indexOf('{', i)

    if (at !== -1 && at <= nextRule) {
      // Copy the @media prelude verbatim, then recurse into its body.
      const open = css.indexOf('{', at)
      let depth = 1
      let j = open + 1
      while (j < css.length && depth > 0) {
        if (css[j] === '{') depth++
        else if (css[j] === '}') depth--
        j++
      }
      result += css.slice(i, open + 1)
      result += convertCss(css.slice(open + 1, j - 1))
      result += '}'
      i = j
      continue
    }

    if (nextRule === -1) {
      result += css.slice(i)
      break
    }

    const close = css.indexOf('}', nextRule)
    if (close === -1) {
      result += css.slice(i)
      break
    }

    const selector = css.slice(i, nextRule)
    const body = css.slice(nextRule + 1, close)
    result += rewriteSelector(selector) + '{' + body + '}'
    i = close + 1
  }

  return result
}

function convertHtml(html, classes) {
  let result = html
  // Point every CTA at funnel step 2. The source keeps in-page anchors so it
  // still previews standalone in a browser; here they become the real link.
  result = result.replace(/href="#register(-step)?"/g, `href="${REGISTER_URL}"`)
  // Rewrite class attributes only — never text content.
  result = result.replace(/\sclass="([^"]*)"/g, (_all, value) => {
    const rewritten = value
      .split(/\s+/)
      .filter(Boolean)
      .map((cls) => (classes.includes(cls) ? PREFIX + cls : cls))
      .join(' ')
    return ` class="${rewritten}"`
  })
  return result
}

const between = (text, start, end) => {
  const a = text.indexOf(start)
  const b = text.indexOf(end, a)
  if (a === -1 || b === -1) throw new Error(`markers not found: ${start}`)
  return text.slice(a, b)
}

// --- read sources -------------------------------------------------------

const css = src('styles.css')
const classes = declaredClasses(css)
const masterclass = src('masterclass.html')
const thanks = src('thanks.html')

// Inline the logo as a data URI so the blocks paste and render immediately,
// with no GHL media-library upload step. Swap for a hosted URL if you'd rather
// keep the block small.
const logoBytes = readFileSync(join(here, '..', 'public', 'logo.png'))
const logo = `data:image/png;base64,${logoBytes.toString('base64')}`

// --- stylesheet ---------------------------------------------------------

const HEADER = `/* eCommHarvest — GoHighLevel stylesheet
 *
 * Paste ONCE into: Funnel Settings -> Custom CSS  (or Page Settings -> Custom CSS)
 * Do NOT wrap in <style> tags there; GHL adds them.
 *
 * Every selector is namespaced 'ech-' and scoped under '.ech-scope', so this
 * cannot restyle GoHighLevel's own buttons, forms or text — and GHL's styles
 * cannot leak into these blocks.
 *
 * Generated by ghl/build.mjs. Edit the source, not this file.
 */
`

/**
 * Page builders — GHL included — emit `!important` liberally. `!important` beats
 * specificity outright, so the only way to hold our design is to compete on the
 * same footing: mark our declarations important too.
 *
 * This stays internally consistent. Between two important declarations,
 * specificity and order still decide, and every rule here is at least 0-1-1
 * (`.ech-scope h1`) versus a builder's 0-0-1 (`h1`) — so ours wins.
 *
 * Skipped: custom-property definitions (pointless) and @keyframes bodies (where
 * !important is ignored by spec).
 */
const harden = (cssText) =>
  cssText.replace(/\{([^{}]*)\}/g, (whole, body) => {
    // Only skip empty blocks. Custom properties are handled per-declaration
    // below — testing the whole body for '--' would also skip every rule that
    // merely *uses* var(--x), which is most of the design.
    if (!body.trim()) return whole
    const hardened = body
      .split(';')
      .map((decl) => {
        const d = decl.trim()
        if (!d || d.includes('!important') || d.startsWith('--')) return decl
        return `${decl}!important`
      })
      .join(';')
    return `{${hardened}}`
  })

// Neutralise the host page's global rules inside our wrapper, then let our own
// (more specific) rules apply on top. `.ech-scope *` at 0-1-0 beats any bare
// element selector at 0-0-1, while every real rule below is 0-1-1 or higher and
// still wins over this. Verified by rendering against hostile CSS.
const ARMOUR = harden(`
/* --- scoped reset: keeps the host page's global CSS out of these blocks --- */
.ech-scope *,
.ech-scope *::before,
.ech-scope *::after{margin:0;padding:0;border:0;outline:0;background:transparent;
  font:inherit;font-size:inherit;font-weight:inherit;font-family:inherit;font-style:normal;
  line-height:inherit;letter-spacing:inherit;text-transform:none;text-decoration:none;
  text-align:inherit;color:inherit;list-style:none;box-shadow:none;float:none;
  vertical-align:baseline;text-indent:0;white-space:normal;box-sizing:border-box}
.ech-scope strong,.ech-scope b{font-weight:700}
.ech-scope em,.ech-scope i{font-style:italic}
.ech-scope img,.ech-scope iframe{max-width:100%;border:0}
.ech-scope button{cursor:pointer;-webkit-appearance:none;appearance:none}
/* --- end scoped reset --- */
`)

const INLINE_HEADER = `/* eCommHarvest — GoHighLevel stylesheet, inlined
 *
 * This lives inside the block, so nothing needs pasting into any GHL CSS field.
 *
 * Every selector is namespaced 'ech-' and scoped under '.ech-scope', so this
 * cannot restyle GoHighLevel's own buttons, forms or text — and GHL's styles
 * cannot leak into these blocks.
 *
 * Generated by ghl/build.mjs. Edit the source, not this file.
 */
`

const convertedCss = HEADER + ARMOUR + harden(convertCss(css)).replace(/\n{3,}/g, '\n\n').trim() + '\n'

// --- masterclass blocks -------------------------------------------------

const mcMain = between(masterclass, '<div class="slot hero">', '<footer>')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<\/main>\s*$/, '')

// Split at the final CTA card. There is no form to fit around any more — the
// split survives only so the page can be pasted in pieces if one 80kb paste
// misbehaves in the builder.
const finalCtaMarker = '<div class="final-in" id="register">'
const ctaAt = mcMain.indexOf(finalCtaMarker)
if (ctaAt === -1) throw new Error('could not find the final CTA card')
const bodyPart = mcMain.slice(0, ctaAt)
const ctaPart = mcMain.slice(ctaAt)

// Hero + hosted-by bar go in block 1; everything up to the CTA in block 2.
const hostbarEnd = bodyPart.indexOf('<!-- FAITH FIRST -->') !== -1
  ? bodyPart.indexOf('<!-- FAITH FIRST -->')
  : bodyPart.indexOf('<div class="slot">')
const heroPart = bodyPart.slice(0, hostbarEnd)
const restPart = bodyPart.slice(hostbarEnd)

/** Strips the "paste the stylesheet" instruction — untrue for self-contained blocks. */
const noCssNote = (text) =>
  text.replace(/\n\s*Requires the stylesheet[^\n]*\n/, '\n')

const wrap = (label, inner, note) => `<!-- eCommHarvest — ${label}
     Paste into a "Custom JS/HTML" element (Elements -> Add element -> search "Custom").
     Requires the stylesheet from ghl/blocks/masterclass-styles.css in Funnel Settings -> Custom CSS.${note ? '\n     ' + note : ''}
-->
<div class="${SCOPE}">
${convertHtml(inner, classes).trim()}
</div>
`

const topbar = `<header class="${PREFIX}topbar">
  <div class="${PREFIX}topbar-in">
    <a href="/" class="${PREFIX}brand" aria-label="eCommHarvest">
      <img src="${logo}" alt="eCommHarvest" width="197" height="34">
    </a>
    <div class="${PREFIX}topbar-right">
      <span class="${PREFIX}stamp">Thursday, September 3 &middot; 11:00 AM MT &middot; free</span>
    </div>
  </div>
</header>`

const MC_FOOTER = `
<footer>
  <div class="foot-in">
    <span>&copy; 2026 eCommHarvest</span>
    <nav class="foot-nav">
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms &amp; Conditions</a>
    </nav>
    <span>Hosted by Tiny 3D Temples &middot; B.O.M.Socks &middot; Come Follow Me FHE</span>
  </div>
</footer>`

const written = []
written.push(out('masterclass-styles.css', convertedCss))
written.push(
  out(
    '1-hero.html',
    wrap('Block 1 of 3: header, hero, hosted-by bar', topbar + '\n' + heroPart),
  ),
)
written.push(
  out(
    '2-body.html',
    wrap(
      'Block 2 of 3: faith-first, curriculum, paid social, who it is for, speakers',
      restPart,
    ),
  ),
)
written.push(
  out(
    '3-cta-footer.html',
    wrap('Block 3 of 3: final CTA card + footer', ctaPart + MC_FOOTER),
  ),
)

/**
 * The whole landing page as ONE block, stylesheet included.
 *
 * This is the one to use. With the form gone to its own funnel step there is no
 * reason to paste a page in pieces: one Custom JS/HTML element carries the
 * styles and the entire page, so there is nothing to order wrongly and no GHL
 * CSS field involved.
 */
written.push(
  out(
    'LANDING-PAGE.html',
    `<!-- eCommHarvest \u2014 masterclass landing page, complete
     Funnel step 1. Paste this WHOLE thing into ONE "Custom JS/HTML" element.
     Nothing else to configure: the stylesheet is included.
     Every "Save my seat" button links to ${REGISTER_URL} \u2014 funnel step 2,
     which is GoHighLevel's own form. Rebuild with REGISTER_URL=/your-path if
     that step's path differs.
-->
<style>
${convertedCss.replace(HEADER, INLINE_HEADER)}
</style>

${noCssNote(wrap('masterclass landing page', topbar + '\n' + mcMain + MC_FOOTER))}`,
  ),
)

// --- home page ----------------------------------------------------------

// A designed home page did not exist before this — the app's `/` was a thin
// placeholder. This is built from the same design system so it needs no new CSS,
// with one section deliberately left as a marked placeholder for David's copy.
const home = src('home.html')
// Stop before the CTA card — that goes in block 2, and running to </main> here
// would emit it in both blocks.
const homeMain = between(home, '<div class="slot hero">', '<div class="final-in">').replace(
  /<!--[\s\S]*?-->/g,
  '',
)
written.push(
  out(
    'home-1-body.html',
    wrap('Home page, block 1 of 2: hero, the three arms, your copy section', topbar + '\n' + homeMain),
  ),
)
written.push(
  out(
    'home-2-cta.html',
    wrap('Home page, block 2 of 2: masterclass CTA + footer', between(home, '<div class="final-in">', '</main>').replace(/<!--[\s\S]*?-->/g, '') + `
<footer>
  <div class="foot-in">
    <span>&copy; 2026 eCommHarvest</span>
    <nav class="foot-nav">
      <a href="/masterclass">Masterclass</a>
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms &amp; Conditions</a>
    </nav>
  </div>
</footer>`),
  ),
)

// --- thank-you page -----------------------------------------------------

const thanksMain = between(thanks, '<div class="thanks">', '<footer>')
  .replace(/<!--[\s\S]*?-->/g, '')
  // The region runs up to <footer>, which sweeps in the page's closing </main>.
  .replace(/<\/main>\s*$/, '')
written.push(
  out(
    'thanks.html',
    wrap('Thank-you page: one block, paste as the only Custom JS/HTML element', topbar + '\n' + thanksMain),
  ),
)

/**
 * Self-contained variants: the stylesheet inlined into the block itself.
 *
 * GoHighLevel's CSS and tracking-code fields proved unreliable in practice —
 * the stylesheet did not reach the published page from either. These variants
 * take every GHL field out of the equation: one paste into one Custom JS/HTML
 * element carries both the styles and the markup, so there is nothing left to
 * misconfigure.
 *
 * Only the FIRST block on a page needs this; the styles then apply to every
 * later block on the same page. Hence one variant per page, not per block.
 */
const selfContained = (blockName, outName, label) => {
  const inner = readFileSync(join(here, 'blocks', blockName), 'utf8')
  return out(
    outName,
    `<!-- eCommHarvest — ${label}
     SELF-CONTAINED: includes the stylesheet, so no GHL CSS or tracking-code
     field is involved. Paste this whole thing into ONE "Custom JS/HTML" element.
     Later blocks on the SAME page do not repeat the stylesheet.
-->
<style>
${convertedCss.replace(HEADER, INLINE_HEADER)}
</style>

${noCssNote(inner)}`,
  )
}
written.push(selfContained('thanks.html', 'thanks-WITH-CSS.html', 'Thank-you page, whole page + stylesheet'))
written.push(selfContained('home-1-body.html', 'home-1-WITH-CSS.html', 'Home page, first block + stylesheet'))

/**
 * Mirror every block as .txt in ghl/paste-me/.
 *
 * Double-clicking an .html file opens it in a browser, which *renders* it — so
 * copying that window yields the visible words with the tags stripped out, which
 * is useless for pasting into a page builder. A .txt opens in a text editor and
 * copies as source.
 *
 * Generated rather than committed, so these can never drift from the blocks they
 * mirror. Stale paste files would be a genuinely nasty footgun.
 */
const pasteDir = join(here, 'paste-me')
mkdirSync(pasteDir, { recursive: true })
const mirrored = readdirSync(join(here, 'blocks'))
for (const name of mirrored) {
  copyFileSync(join(here, 'blocks', name), join(pasteDir, `${name}.txt`))
}

console.log('wrote ghl/blocks/:')
written.forEach((w) => console.log('  ' + w))
console.log(`mirrored ${mirrored.length} files to ghl/paste-me/*.txt (open in a text editor, not a browser)`)
