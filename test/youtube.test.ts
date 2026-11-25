/**
 * The /youtube page seed.
 *
 *   npx tsx test/youtube.test.ts
 *
 * The page ships with no channel link and no videos, because none were supplied;
 * these checks keep it that way until somebody pastes the real ones.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { findDashes } from '@/lib/roadmap'
import { youtubeId } from '@/lib/replay'
import { YOUTUBE_PAGES } from '@/seed/youtube-page'

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

type Block = { type: string; props: Record<string, any> }
const page = YOUTUBE_PAGES[0]
const blocks = page.content.content as Block[]

test('there is one page, at /youtube', () => {
  assert.equal(YOUTUBE_PAGES.length, 1)
  assert.equal(page.slug, 'youtube')
  assert.equal(page.path, '/youtube')
  assert.match(readFileSync('src/lib/builder-page.ts', 'utf8'), /youtube: '\/youtube'/)
})

test('no channel link and no video is invented', () => {
  assert.equal(blocks.find((b) => b.type === 'Hero')!.props.ctaHref, '')
  assert.deepEqual(blocks.find((b) => b.type === 'VideoGallery')!.props.items, [])
  assert.ok(!/youtube\.com|youtu\.be/.test(JSON.stringify(page.content)))
})

test('the only outgoing link is to the Weekly page', () => {
  const cta = blocks.find((b) => b.type === 'CtaCard')!
  assert.equal(cta.props.ctaHref, '/weekly')
})

test('no dashes in the copy or the meta', () => {
  assert.deepEqual(findDashes(page), [])
})

test('block ids are unique', () => {
  const ids = blocks.map((b) => b.props.id)
  assert.equal(new Set(ids).size, ids.length)
})

test('the migration is registered', () => {
  assert.match(readFileSync('src/migrations/index.ts', 'utf8'), /20261125_150000_youtube_page/)
})

test('a mistyped link is not a video, so it publishes nothing', () => {
  assert.equal(youtubeId('https://www.youtube.com/@ecommharvest'), null)
  assert.equal(youtubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
})

console.log(`\n${passed} passed`)
