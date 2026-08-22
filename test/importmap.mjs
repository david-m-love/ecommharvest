/**
 * The admin's component registry contains what the admin will ask for.
 *
 *   npm run test:importmap
 *
 * This has bitten this project once, in production, and it is worth
 * understanding because nothing else catches it:
 *
 * Payload resolves admin components through a generated file,
 * `src/app/(payload)/admin/importMap.js`. Plugins contribute components — the
 * Vercel Blob adapter contributes an upload handler — but only when the plugin
 * is *active*, and it is active only when its credentials are present. So
 * connecting the Blob store in Vercel changed which components the admin needs,
 * while the file on disk stayed as it was. The admin then looked for
 * `@payloadcms/storage-vercel-blob/client#VercelBlobClientUploadHandler`, did
 * not find it, and died on the client: HTTP 200, a blank screen, and no error
 * anywhere the server could see it.
 *
 * The file is generated, not committed, precisely because two commands disagree
 * about its contents: `next dev` regenerates it from a local environment with no
 * blob token and drops that handler, while a deploy has the token and keeps it.
 * So this does not compare against a stored copy — it generates the map the way
 * a deploy does, with the blob token present, and checks the handler is in it.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const MAP = 'src/app/(payload)/admin/importMap.js'

/** Shape-valid and obviously fake: the adapter rejects anything else. */
const PLACEHOLDER_BLOB_TOKEN = 'vercel_blob_rw_importmaponly_0000000000000000'

/**
 * Components the admin cannot start without. Each one is here because it was
 * missing once, or because losing it would fail the same silent way.
 */
const REQUIRED = [
  '@payloadcms/storage-vercel-blob/client#VercelBlobClientUploadHandler',
  '@/components/BuilderNavLink',
]

let failed = 0
const check = (ok, label, detail = '') => {
  console.log(`${ok ? ' ok ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed++
}

try {
  execFileSync('npx', ['payload', 'generate:importmap'], {
    stdio: 'pipe',
    env: { ...process.env, BLOB_READ_WRITE_TOKEN: PLACEHOLDER_BLOB_TOKEN },
  })
  check(true, 'the import map generates the way a deploy generates it')
} catch (err) {
  check(false, 'the import map generates', String(err.stderr || err.message).trim().split('\n')[0])
  console.error('\n      Needs DATABASE_URI and PAYLOAD_SECRET, the same as a build.')
  process.exit(1)
}

const map = readFileSync(MAP, 'utf8')
for (const key of REQUIRED) {
  check(
    map.includes(key),
    `the admin can resolve ${key}`,
    map.includes(key) ? '' : 'absent — the admin would load to a blank page',
  )
}

console.log(failed === 0 ? '\nthe admin has every component it asks for' : `\n${failed} missing`)
process.exit(failed === 0 ? 0 : 1)
