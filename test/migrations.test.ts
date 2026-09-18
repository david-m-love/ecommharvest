/**
 * The migration manifest is well formed.
 *
 *   npx tsx test/migrations.test.ts
 *
 * `src/migrations/index.ts` is a hand-maintained list, and every entry is three
 * lines of boilerplate that have to agree with a filename. The failure mode is
 * silent and total: a missing `name`, a duplicated one, or an entry pointing at
 * the wrong module, and `payload migrate` either skips work or throws — during
 * the Vercel build, which means the deploy fails or, worse, succeeds with the
 * database a version behind the code.
 *
 * Caught here because it has already happened once: an automated edit dropped a
 * single `name:` line while adding the entry below it, and nothing in the
 * typecheck objected — `name` is optional in Payload's type.
 */
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'

import { migrations } from '@/migrations'

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

const names = migrations.map((m) => m.name)

test('every migration has a name and both directions', () => {
  for (const [i, migration] of migrations.entries()) {
    assert.ok(migration.name, `migration at index ${i} has no name`)
    assert.equal(typeof migration.up, 'function', `${migration.name} has no up()`)
    assert.equal(typeof migration.down, 'function', `${migration.name} has no down()`)
  }
})

test('no name is used twice', () => {
  const seen = new Set<string>()
  const duplicates = names.filter((name) => (seen.has(name!) ? true : (seen.add(name!), false)))
  assert.deepEqual(duplicates, [], `duplicated: ${duplicates.join(', ')}`)
})

test('they are listed in the order they run', () => {
  // Payload runs them in array order; the timestamps are what make that order
  // meaningful, so a new one pasted into the middle would run before migrations
  // that already ran on production.
  assert.deepEqual(names, [...names].sort())
})

test('every migration file is registered, and every entry has a file', () => {
  const files = readdirSync('src/migrations')
    .filter((file) => /^\d{8}_\d{6}_.+\.ts$/.test(file))
    .map((file) => file.replace(/\.ts$/, ''))
    .sort()
  const missing = files.filter((file) => !names.includes(file))
  const orphaned = names.filter((name) => !files.includes(name!))
  assert.deepEqual(missing, [], `written but never registered — these will not run: ${missing}`)
  assert.deepEqual(orphaned, [], `registered but no such file: ${orphaned}`)
})

console.log(`\n${passed} passed`)
