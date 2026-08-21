/**
 * Guards the one bug development mode cannot show you.
 *
 *   npm run build && npm run test:prerender
 *
 * `next build` prerenders any route it judges not to be request-specific. For
 * most sites that is exactly right. For the pages this site edits in the
 * builder it is silently wrong: the page keeps serving its deploy-time HTML, so
 * pressing "Update live page" — or changing a brand colour in Site Styles —
 * updates the database and nothing a visitor sees, until the next deploy.
 *
 * `next dev` renders every request fresh, so the whole editing loop passes
 * locally while being broken in production. The only place the truth shows is
 * the build output, which is what this reads.
 */

import { readFileSync } from 'node:fs'

/**
 * Routes that must read the database on each request, and why. The reason is
 * printed on failure, because "/ is prerendered" is not enough to act on.
 */
const MUST_BE_DYNAMIC = [
  ['/', 'the home page is edited in the builder and republished without a deploy'],
  ['/masterclass', 'the masterclass page is edited in the builder'],
  ['/privacy', 'a Site Styles colour change has to reach every page'],
  ['/terms', 'a Site Styles colour change has to reach every page'],
  ['/masterclass/thanks', 'a Site Styles colour change has to reach every page'],
]

let manifest
try {
  manifest = JSON.parse(readFileSync('.next/prerender-manifest.json', 'utf8'))
} catch {
  console.error(
    'FAIL  no .next/prerender-manifest.json — run `npm run build` first.\n' +
      '      (This check reads the build output; there is nothing to read in dev.)',
  )
  process.exit(1)
}

const prerendered = new Set(Object.keys(manifest.routes || {}))

let failed = 0
for (const [route, why] of MUST_BE_DYNAMIC) {
  const isStatic = prerendered.has(route)
  console.log(`${isStatic ? 'FAIL' : ' ok '} ${route} renders per request`)
  if (isStatic) {
    console.log(`      frozen at deploy time, but ${why}.`)
    console.log(`      Fix: keep \`export const dynamic = 'force-dynamic'\` in src/app/(frontend)/layout.tsx.`)
    failed++
  }
}

console.log(
  failed === 0
    ? `\nall ${MUST_BE_DYNAMIC.length} routes render per request`
    : `\n${failed} route(s) would serve stale HTML in production`,
)
process.exit(failed === 0 ? 0 : 1)
