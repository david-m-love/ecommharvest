/**
 * What must not go live with a sales page.
 *
 *   npx tsx test/weekly-publish.test.ts
 *
 * A draft may say "to be confirmed before publishing" in a field that, once the
 * page is public, is printed under a headline number. These check that such a
 * block is held back — and, as importantly, that nothing else is touched.
 */
import assert from 'node:assert/strict'

import { WEEKLY_PAGES } from '@/seed/weekly-pages'
import { holdUnconfirmedClaims, isUnconfirmed } from '@/lib/weekly-publish'

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

const block = (id: string, note?: string, show: boolean | undefined = true) => ({
  type: 'CaseStudy',
  props: { id, show, note },
})
const page = (...blocks: unknown[]) => ({ root: {}, content: blocks })

test('a block whose note says it is unconfirmed is switched off', () => {
  const result = holdUnconfirmedClaims(
    page(block('ok', 'November 2024 vs November 2025.'), block('15x', 'Definition to be confirmed before publishing.')),
  )
  assert.deepEqual(result.held, ['15x'])
  assert.equal((result.content.content![1] as any).props.show, false)
  assert.equal((result.content.content![0] as any).props.show, true)
})

test('held means switched off, not deleted — every word stays for the builder', () => {
  const before = { type: 'CaseStudy', props: { id: 'x', show: true, heading: 'Keep me', statAfter: '15x', note: 'to be confirmed' } }
  const after = (holdUnconfirmedClaims(page(before)).content.content![0] as any).props
  assert.equal(after.heading, 'Keep me')
  assert.equal(after.statAfter, '15x')
  assert.equal(after.note, 'to be confirmed')
  assert.equal(after.show, false)
})

test('every way a draft says "not yet" is recognised', () => {
  for (const note of [
    'Definition to be confirmed before publishing.',
    'To be confirmed',
    'confirm before publishing',
    'Confirmed before publish',
    'TBC',
    'tbd',
    'Figure TBD — ask David',
  ]) {
    assert.equal(isUnconfirmed(block('n', note)), true, note)
  }
})

test('ordinary notes are not mistaken for it', () => {
  for (const note of [
    'November 2024 compared with November 2025, same store.',
    'Revenue as attributed by Klaviyo, not a measured incremental lift.',
    'Return as reported by the brand’s email platform.',
    'This was confirmed by the founder.',
    '',
    undefined,
  ]) {
    assert.equal(isUnconfirmed(block('n', note as string)), false, String(note))
  }
})

test('a note somebody has since edited is left alone — they have looked at it', () => {
  const result = holdUnconfirmedClaims(page(block('15x', 'Return on ad spend, as reported by Klaviyo.')))
  assert.deepEqual(result.held, [])
  assert.equal((result.content.content![0] as any).props.show, true)
})

test('a block already switched off is not reported as newly held', () => {
  const result = holdUnconfirmedClaims(page(block('15x', 'to be confirmed', false)))
  assert.deepEqual(result.held, [])
})

test('running it twice changes nothing the second time', () => {
  const once = holdUnconfirmedClaims(page(block('15x', 'to be confirmed'))).content
  const twice = holdUnconfirmedClaims(once)
  assert.deepEqual(twice.held, [])
  assert.deepEqual(twice.content, once)
})

test('the input is not mutated', () => {
  const input = page(block('15x', 'to be confirmed'))
  const snapshot = JSON.stringify(input)
  holdUnconfirmedClaims(input)
  assert.equal(JSON.stringify(input), snapshot)
})

test('malformed content does not throw', () => {
  for (const bad of [null, undefined, 'x', 7, {}, { content: 'no' }, { content: [null, 3, {}] }]) {
    assert.doesNotThrow(() => holdUnconfirmedClaims(bad), JSON.stringify(bad))
  }
})

test('as seeded, neither Weekly page ships an unconfirmed claim switched on', () => {
  /**
   * The seed is what a fresh database, a local run and a preview get, so it has to
   * hold the same line as the migration does on the live site. A visible block
   * carrying a "to be confirmed" note is exactly what this change exists to stop.
   */
  for (const seeded of WEEKLY_PAGES) {
    for (const b of seeded.content.content as any[]) {
      if (isUnconfirmed(b)) {
        assert.equal(b.props.show, false, `${seeded.slug}: ${b.props.id} is unconfirmed but switched on`)
      }
    }
  }
})

console.log(`\n${passed} passed`)
