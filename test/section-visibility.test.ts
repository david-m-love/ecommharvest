/**
 * When a page section publishes, and when it stays quiet.
 *
 *   npx tsx test/section-visibility.test.ts
 *
 * These rules decide what a stranger sees on a sales page that is being filled
 * in over several days. Get them wrong in the forgiving direction and the page
 * publishes an empty logo bar and a testimonial card with no quote in it — which
 * is worse than the section being absent, because it says nobody checked.
 */
import assert from 'node:assert/strict'

import { filled, hasText, isShown, sectionState } from '@/lib/section-visibility'

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

test('whitespace is not content', () => {
  assert.equal(hasText('a quote'), true)
  assert.equal(hasText(''), false)
  assert.equal(hasText('   '), false)
  assert.equal(hasText('\n\t'), false)
  assert.equal(hasText(undefined), false)
  assert.equal(hasText(null), false)
})

test('a block with no show field keeps rendering', () => {
  /**
   * The compatibility rule. Every page already stored was saved before this
   * field existed, so `show` is undefined on all of them — and they must look
   * exactly the same after the deploy that adds it.
   */
  assert.equal(isShown(undefined), true)
  assert.equal(isShown(true), true)
  assert.equal(isShown(false), false)
})

test('empty repeatable items are dropped', () => {
  const quotes = [{ quote: 'real' }, { quote: '' }, { quote: '  ' }, { quote: 'also real' }]
  assert.deepEqual(
    filled(quotes, (q) => hasText(q.quote)).map((q) => q.quote),
    ['real', 'also real'],
  )
  assert.deepEqual(filled(undefined, () => true), [])
})

test('a filled, switched-on section renders', () => {
  assert.equal(sectionState({ show: true, hasContent: true }), 'render')
  assert.equal(sectionState({ hasContent: true }), 'render', 'no switch set yet')
})

test('switched off publishes nothing, but stays clickable in the builder', () => {
  assert.equal(sectionState({ show: false, hasContent: true }), 'nothing')
  assert.equal(sectionState({ show: false, hasContent: true, editing: true }), 'placeholder')
})

test('empty publishes nothing, and says so in the builder', () => {
  // The case that matters most: a section dropped on the page days before
  // anyone has the logos or the screenshots for it.
  assert.equal(sectionState({ show: true, hasContent: false }), 'nothing')
  assert.equal(sectionState({ show: true, hasContent: false, editing: true }), 'placeholder')
})

test('the builder never renders nothing', () => {
  // A block that vanishes from the canvas cannot be selected, so its fields
  // cannot be reached and the content can never be added.
  for (const show of [true, false, undefined]) {
    for (const hasContent of [true, false]) {
      assert.notEqual(sectionState({ show, hasContent, editing: true }), 'nothing')
    }
  }
})

console.log(`\n${passed} passed`)
