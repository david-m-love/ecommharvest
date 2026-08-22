/**
 * Does a freshly migrated database match what the code expects?
 *
 *   npm run test:schema
 *
 * This is the check for the bug that has now shipped twice, and the second time
 * took the site logo down for a morning.
 *
 * The trap: local development runs Payload with `push` on, so adding a field to
 * a collection or a global silently alters the local database to match. Nothing
 * fails, nothing warns, and the migration nobody wrote is not missed until
 * production — which only ever runs migrations — asks for a column that was
 * never created. Payload selects every column a table declares, so *one*
 * missing column breaks *every* read of that table.
 *
 * And it breaks it invisibly. Postgres says "column does not exist", Payload
 * turns that into a 500, and the front end catches it and falls back to its
 * defaults: the logo becomes the text wordmark on every page and the Site Styles
 * screen answers "Nothing found". Nothing on screen mentions a column.
 *
 * How it checks: build a database from the committed migrations alone, then ask
 * Payload to generate a migration against it. Payload's own diff is the oracle —
 * "No schema changes detected" means the migrations describe the whole config.
 * Anything else is a field somebody added without one, and the generated SQL
 * names it.
 *
 * Needs a Postgres it can create and drop a database on, which is the local one.
 * It never touches the app's own database.
 */

import { spawn } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'

import 'dotenv/config'

/**
 * Runs a command with **no stdin at all**, and collects its output.
 *
 * `spawn` rather than `execFile` for exactly one reason: with no schema changes
 * Payload asks "create a blank migration file?" and waits. `execFile` always
 * gives the child an open stdin pipe and offers no way to close it, so the first
 * version of this check hung for ten minutes instead of passing.
 */
const run = (command, args, env) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', (chunk) => (out += chunk))
    child.stderr.on('data', (chunk) => (out += chunk))
    child.on('error', reject)
    child.on('close', (code) => resolve({ out, code }))
  })

const SCRATCH = 'ech_schema_check'
const MIGRATIONS = 'src/migrations'
const INDEX = `${MIGRATIONS}/index.ts`

let passed = 0
let failed = 0
const check = (ok, label, detail = '') => {
  console.log(`${ok ? ' ok ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`)
  ok ? passed++ : failed++
}

const uri = process.env.DATABASE_URI
if (!uri) {
  console.log('FAIL DATABASE_URI is not set — nothing to check against.')
  process.exit(1)
}

/** The same server, a different database. */
const scratchUri = uri.replace(/\/[^/?]+(\?|$)/, `/${SCRATCH}$1`)
const adminUri = uri.replace(/\/[^/?]+(\?|$)/, '/postgres$1')

const { Client } = await import('pg')

const sql = async (connectionString, statement) => {
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
  })
  await client.connect()
  try {
    return await client.query(statement)
  } finally {
    await client.end().catch(() => {})
  }
}

/** Files present before anything runs, so a generated one can be spotted. */
const before = new Set(readdirSync(MIGRATIONS))
const indexBefore = readFileSync(INDEX, 'utf8')

try {
  console.log('a database built from the migrations alone')
  await sql(adminUri, `DROP DATABASE IF EXISTS ${SCRATCH}`)
  await sql(adminUri, `CREATE DATABASE ${SCRATCH}`)
  check(true, `created ${SCRATCH}`)

  const migrated = await run('npx', ['payload', 'migrate'], { DATABASE_URI: scratchUri })
  const ran = migrated.out.match(/Migrated: /g)?.length || 0
  check(ran > 0, 'the migrations ran', `${ran} migrations`)

  console.log('\nand what the code expects of it')
  const diff = await run('npx', ['payload', 'migrate:create', 'schema_drift_check'], {
    DATABASE_URI: scratchUri,
  })
  const clean = diff.out.includes('No schema changes detected')

  /** Whatever it generated, so the repository is left as it was found. */
  const added = readdirSync(MIGRATIONS).filter((name) => !before.has(name))
  let generatedSql = ''
  for (const name of added) {
    const path = `${MIGRATIONS}/${name}`
    if (name.endsWith('.ts')) {
      // The `up` half only. Reading the whole file reports each missing column
      // twice — once to add it, once to drop it again — which reads as two
      // problems.
      generatedSql += readFileSync(path, 'utf8').split('export async function down')[0]
    }
    rmSync(path)
  }
  if (readFileSync(INDEX, 'utf8') !== indexBefore) writeFileSync(INDEX, indexBefore)

  const statements = generatedSql.match(/(ALTER|CREATE|DROP)\s+TABLE[^;]*/gi) || []
  check(
    clean && statements.length === 0,
    'every field in the config has a migration behind it',
    clean ? 'nothing missing' : `${statements.length} statement(s) missing`,
  )
  if (statements.length > 0) {
    console.log('\nThese are in the config and in no migration:')
    for (const statement of statements) console.log(`  ${statement.replace(/\s+/g, ' ').trim()}`)
    console.log(
      '\nWrite it:  npm run migrate:create -- <name>   (against a migrated database)\n' +
        'Local development hides this, because `push` adds the column for you.',
    )
  }
} finally {
  await sql(adminUri, `DROP DATABASE IF EXISTS ${SCRATCH}`).catch(() => {})
  // Belt and braces: a crash mid-run must not leave a half-written index.
  if (existsSync(INDEX) && readFileSync(INDEX, 'utf8') !== indexBefore) writeFileSync(INDEX, indexBefore)
}

console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
