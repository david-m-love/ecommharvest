/**
 * The admin's component registry must list every component the admin will ask
 * for. When it does not, the admin renders a blank white page.
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
 * while the committed registry stayed as it was. The admin then looked for
 * `@payloadcms/storage-vercel-blob/client#VercelBlobClientUploadHandler`, did
 * not find it, and died on the client: HTTP 200, a blank screen, and no error
 * anywhere the server could see it.
 *
 * The generated map depends on the environment, so this pins the environment: it
 * regenerates with a placeholder blob token — the value is never used, but the
 * adapter validates its shape — and fails if the result differs from what is
 * committed. In other words it asserts the registry covers the *deployed*
 * configuration, not the developer's local one.
 *
 * `vercel-build` also regenerates the map, so production self-corrects. This
 * check exists so a plain `next build`, or anyone reading the diff, sees the
 * mismatch first.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const MAP = 'src/app/(payload)/admin/importMap.js'

/** Shape-valid and obviously fake: the adapter rejects anything else. */
const PLACEHOLDER_BLOB_TOKEN = 'vercel_blob_rw_importmaponly_0000000000000000'

const before = readFileSync(MAP, 'utf8')

try {
  execFileSync('npx', ['payload', 'generate:importmap'], {
    stdio: 'pipe',
    env: { ...process.env, BLOB_READ_WRITE_TOKEN: PLACEHOLDER_BLOB_TOKEN },
  })
} catch (err) {
  console.error('FAIL  could not generate the import map')
  console.error(String(err.stderr || err.stdout || err.message).trim())
  console.error('\n      Needs DATABASE_URI and PAYLOAD_SECRET, the same as a build.')
  process.exit(1)
}

const after = readFileSync(MAP, 'utf8')

if (after === before) {
  console.log(' ok  the admin import map covers the deployed configuration')
  process.exit(0)
}

// Leave the regenerated file in place: it is the fix, and a diff is easier to
// read than a description of one.
writeFileSync(MAP, after)
console.error('FAIL  the admin import map is out of date')
console.error(`      ${MAP} has been regenerated for you — commit it.`)
console.error('      Deployed as-is, the admin would have loaded to a blank page.')
process.exit(1)
