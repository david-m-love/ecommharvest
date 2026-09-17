/**
 * One date, everywhere.
 *
 *   npx tsx test/event.test.ts
 *
 * Moving the masterclass — 3 September, then 10, then 24 — meant changing it in
 * the structured data, the calendar file, four block defaults, two seeded pages,
 * two legal pages, the thank-you page and four GoHighLevel blocks. Finding all
 * of those took a search; missing one would have advertised a date that had
 * already passed, or booked somebody's calendar for the wrong week.
 *
 * The running time is checked the same way and for the same reason: it went from
 * ninety minutes to sixty, and a leftover "90 minutes" is a promise the session
 * no longer keeps.
 *
 * So this fails if any file still says a date that disagrees with
 * `src/lib/event.ts`. Move the event by editing that file and running
 * `npm run ghl:build`; if anything is left behind, this says which file.
 *
 * Migrations are excluded on purpose: they are a record of what already ran, and
 * a migration that seeded September 3 in August did exactly that.
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import {
  EVENT_DAY,
  EVENT_END_ISO,
  EVENT_END_UTC,
  EVENT_LENGTH,
  EVENT_START_ISO,
  EVENT_START_UTC,
  EVENT_TIME,
  EVENT_TITLE,
} from '@/lib/event'

let passed = 0
const test = (label: string, fn: () => void) => {
  try {
    fn()
    console.log(`  ok  ${label}`)
    passed++
  } catch (err) {
    console.error(`FAIL  ${label}\n      ${(err as Error).message}`)
    process.exitCode = 1
  }
}

/** "20260924T170000Z" from an ISO string with an offset. */
const compactUtc = (iso: string) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '')

test('the UTC times match the local ones', () => {
  // The pairing most likely to go wrong: 11:00 with a -06:00 offset is 17:00Z,
  // and a hand-typed UTC time is how a calendar entry ends up an hour out.
  assert.equal(compactUtc(EVENT_START_ISO), EVENT_START_UTC)
  assert.equal(compactUtc(EVENT_END_ISO), EVENT_END_UTC)
})

test('the offset is the one Mountain Time is actually on that day', () => {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    timeZoneName: 'short',
  })
    .formatToParts(new Date(EVENT_START_ISO))
    .find((part) => part.type === 'timeZoneName')?.value
  // September is daylight time — MDT, UTC−6. Writing MST would be an hour out.
  assert.equal(label, 'MDT')
  assert.ok(EVENT_START_ISO.endsWith('-06:00'), `offset should be -06:00, got ${EVENT_START_ISO}`)
})

test('the wording says MT, not MST or MDT', () => {
  // MT is right all year; MST would be wrong today and MDT reads as jargon.
  assert.match(EVENT_TIME, /\bMT\b/)
  assert.doesNotMatch(EVENT_TIME, /MST|MDT/)
})

test('the day name matches the date', () => {
  const weekday = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Denver',
    weekday: 'long',
  }).format(new Date(EVENT_START_ISO))
  assert.ok(
    EVENT_DAY.startsWith(weekday),
    `${EVENT_DAY} is not a ${weekday} — the date and the day name disagree`,
  )
})

/** Every file that could carry a stale date, minus the ones allowed to. */
const SCAN_ROOTS = ['src', 'ghl/src', 'ghl/blocks', 'ghl/paste-me', 'public']
const SKIP = [
  'src/migrations', // a record of what ran, not of what is true now
  'node_modules',
  '.next',
  'ghl/.verify', // rendered snapshots, rebuilt by ghl:build
]
const SCANNABLE = /\.(ts|tsx|json|html|css|txt|ics|md)$/

const walk = (dir: string, found: string[] = []): string[] => {
  if (SKIP.some((skip) => dir.startsWith(skip))) return found
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (SKIP.some((skip) => path.startsWith(skip))) continue
    if (statSync(path).isDirectory()) walk(path, found)
    else if (SCANNABLE.test(entry)) found.push(path)
  }
  return found
}

const expectedDay = EVENT_DAY.replace(/^[A-Za-z]+,\s*/, '') // "September 24"

/**
 * Two names carry the *original* date on purpose, and must keep it.
 *
 *   - The calendar entry's UID. It identifies the invitation already sitting in
 *     someone's calendar; keeping it is what lets a moved time correct that
 *     entry instead of adding a second one.
 *   - The registration tag. It is how the audience is segmented, and renaming it
 *     would split the people who signed up before the move from the people who
 *     signed up after, for one event.
 *
 * Both are identifiers, not dates on display. They are taken out of the text
 * before it is scanned rather than skipping whole files, so a genuinely stale
 * date in the same file is still caught.
 */
const IDENTIFIERS = /q4-masterclass-2026-09-03/g

test('no file carries a different date', () => {
  const offenders: string[] = []
  for (const root of SCAN_ROOTS) {
    let files: string[] = []
    try {
      files = walk(root)
    } catch {
      continue // an optional directory that does not exist here
    }
    for (const file of files) {
      const contents = readFileSync(file, 'utf8').replace(IDENTIFIERS, '')
      /**
       * `(?!\d)` matters: without it "September 2026" — the last-updated line on
       * the legal pages — reads as "September 20" and gets reported as a stale
       * date that does not exist.
       */
      for (const match of contents.matchAll(/September\s+(\d{1,2})(?!\d)/g)) {
        if (`September ${match[1]}` !== expectedDay) {
          offenders.push(`${file}: "${match[0]}"`)
        }
      }
      // The machine-readable forms, in both the shapes they are written in.
      for (const match of contents.matchAll(/2026-09-\d{2}|202609\d{2}/g)) {
        if (match[0].replace(/-/g, '').slice(6, 8) !== '24') {
          offenders.push(`${file}: "${match[0]}"`)
        }
      }
    }
  }
  assert.equal(
    offenders.length,
    0,
    `these still say another date:\n      ${offenders.join('\n      ')}`,
  )
})

/**
 * How long it runs is a promise too.
 *
 * It moved from ninety minutes to sixty, and it is scattered through the copy in
 * five shapes — "90 minutes", "90-minute", "Built in 90 Minutes", "Ninety
 * minutes". A leftover is not a typo: somebody blocks out an hour and a half, or
 * reads two different lengths on two pages and trusts neither.
 */
test('no file claims a different running time', () => {
  const minutes = Number(EVENT_LENGTH.replace(/\D/g, ''))
  const words: Record<string, string> = { '60': 'sixty', '90': 'ninety' }
  /**
   * Only lengths a masterclass could plausibly be.
   *
   * The app talks about minutes elsewhere — a login link expires in fifteen —
   * and a test that reported those would be noise somebody learns to ignore,
   * which is worse than no test. A genuine leftover here is always one of these.
   */
  const EVENT_LENGTHS = new Set([45, 60, 75, 90, 120])
  const offenders: string[] = []

  for (const root of SCAN_ROOTS) {
    let files: string[] = []
    try {
      files = walk(root)
    } catch {
      continue
    }
    for (const file of files) {
      const contents = readFileSync(file, 'utf8')
      for (const match of contents.matchAll(/(\d{2,3})[\s+-](?:minute|Minute)/g)) {
        const found = Number(match[1])
        if (found !== minutes && EVENT_LENGTHS.has(found)) offenders.push(`${file}: "${match[0]}"`)
      }
      // The spelled-out form, which a find-and-replace on digits walks straight past.
      for (const match of contents.matchAll(/\b(Ninety|Sixty|ninety|sixty)\s+minutes/g)) {
        if (match[1].toLowerCase() !== words[String(minutes)]) {
          offenders.push(`${file}: "${match[0]}"`)
        }
      }
    }
  }
  assert.equal(
    offenders.length,
    0,
    `these still claim another running time:\n      ${offenders.join('\n      ')}`,
  )
})

test('the title says the same running time as everything else', () => {
  // The headline is the one people quote back at you, and it carries the number.
  assert.match(EVENT_TITLE, new RegExp(`\\b${EVENT_LENGTH.replace(/\D/g, '')}\\b`, 'i'))
})

console.log(`\n${passed} passed`)
