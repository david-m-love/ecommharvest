/**
 * The replay link on a community thread.
 *
 *   npx tsx test/replay.test.ts
 *
 * Whatever an admin pastes becomes an iframe source inside the members' area, so
 * the rule worth testing is the negative one: nothing but a YouTube video id ever
 * gets through, in whatever shape it is pasted.
 */
import assert from 'node:assert/strict'

import { replayEmbedUrl, youtubeId } from '@/lib/replay'

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

const ID = 'dQw4w9WgXcQ'

test('the usual shapes of a YouTube link all give the same video', () => {
  for (const link of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&feature=shared`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `youtu.be/${ID}`,
    `  https://youtu.be/${ID}  `,
  ]) {
    assert.equal(youtubeId(link), ID, link)
  }
})

test('the embed address is the privacy-enhanced host with related videos limited', () => {
  assert.equal(replayEmbedUrl(`https://youtu.be/${ID}`), `https://www.youtube-nocookie.com/embed/${ID}?rel=0`)
})

test('a start time is carried over, in seconds or h/m/s form', () => {
  assert.equal(replayEmbedUrl(`https://youtu.be/${ID}?t=90`), `https://www.youtube-nocookie.com/embed/${ID}?rel=0&start=90`)
  assert.equal(replayEmbedUrl(`https://www.youtube.com/watch?v=${ID}&t=1m30s`), `https://www.youtube-nocookie.com/embed/${ID}?rel=0&start=90`)
  assert.equal(replayEmbedUrl(`https://youtu.be/${ID}?t=nonsense`), `https://www.youtube-nocookie.com/embed/${ID}?rel=0`)
})

test('anything that is not a YouTube video is refused', () => {
  for (const link of [
    '',
    '   ',
    'not a url',
    'https://evil.example/watch?v=' + ID,
    'https://evil.example/embed/' + ID,
    `https://youtube.com.evil.example/watch?v=${ID}`,
    `https://notyoutube.com/watch?v=${ID}`,
    `https://youtube.com@evil.example/watch?v=${ID}`,
    `https://user:pw@youtube.com/watch?v=${ID}`,
    `javascript:alert(1)//youtube.com/watch?v=${ID}`,
    `data:text/html,<script>alert(1)</script>`,
    `ftp://youtube.com/watch?v=${ID}`,
    'https://www.youtube.com/watch',
    'https://www.youtube.com/channel/UC1234567890123456789012',
    'https://www.youtube.com/playlist?list=PL1234567890',
    `https://youtu.be/${ID}extra`,
    'https://youtu.be/short',
    `https://youtu.be/${'a'.repeat(400)}`,
  ]) {
    assert.equal(replayEmbedUrl(link), null, link)
  }
})

test('non-strings are refused', () => {
  for (const value of [null, undefined, 42, {}, [], true]) assert.equal(replayEmbedUrl(value), null)
})

test('an id with markup characters in it never reaches the address', () => {
  assert.equal(youtubeId('https://youtu.be/"onload=alert(1)'), null)
  assert.equal(youtubeId('https://www.youtube.com/watch?v="><script>x'), null)
})

console.log(`\n${passed} passed`)
