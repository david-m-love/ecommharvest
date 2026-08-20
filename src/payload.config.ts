import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { AuditLog } from './collections/AuditLog'
import { Courses } from './collections/Courses'
import { Entitlements } from './collections/Entitlements'
import { Lessons } from './collections/Lessons'
import { Media } from './collections/Media'
import { Modules } from './collections/Modules'
import { Pages } from './collections/Pages'
import { Progress } from './collections/Progress'
import { Registrations } from './collections/Registrations'
import { Roles } from './collections/Roles'
import { Users } from './collections/Users'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * These are checked here rather than at first use because `next build` imports
 * this file: without them the whole deployment fails, including the marketing
 * pages, and the default error gives no clue why. Fail early and say what to do.
 */
const missingEnv = (name: string) =>
  new Error(
    `${name} is not set.\n\n` +
      `Locally:  copy .env.example to .env and fill it in, then \`npm run db:start\`.\n` +
      `On Vercel: Storage -> Create Database -> Neon Postgres, which sets DATABASE_URI ` +
      `for you, then add PAYLOAD_SECRET (any long random string) under ` +
      `Settings -> Environment Variables and redeploy.`,
  )

if (!process.env.DATABASE_URI) throw missingEnv('DATABASE_URI')
if (!process.env.PAYLOAD_SECRET) throw missingEnv('PAYLOAD_SECRET')

// Vercel's filesystem is ephemeral, so uploads must go to blob storage in
// production. Locally we fall back to disk, which keeps `npm run dev` working
// with no cloud credentials at all.
const storagePlugins = process.env.BLOB_READ_WRITE_TOKEN
  ? [
      vercelBlobStorage({
        collections: { media: true },
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }),
    ]
  : []

// Transactional email. Without a key Payload falls back to logging, which is
// fine locally — the sign-in route prints the link to the console in dev.
const email = process.env.RESEND_API_KEY
  ? resendAdapter({
      apiKey: process.env.RESEND_API_KEY,
      defaultFromAddress: process.env.EMAIL_FROM_ADDRESS || 'hello@ecommharvest.com',
      defaultFromName: process.env.EMAIL_FROM_NAME || 'eCommHarvest',
    })
  : undefined

export default buildConfig({
  email,
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' — eCommHarvest',
    },
    components: {
      // Puts "Page builder" in the admin sidebar. The canvas itself is a
      // full-window route at /builder — see the component for why.
      afterNavLinks: ['@/components/BuilderNavLink#BuilderNavLink'],
    },
  },
  collections: [
    Pages,
    Courses,
    Modules,
    Lessons,
    Users,
    Roles,
    Entitlements,
    Progress,
    Registrations,
    Media,
    AuditLog,
  ],
  editor: lexicalEditor(),
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI },
    /**
     * Schema changes ship as migrations in `src/migrations`, never as an
     * automatic push against production.
     *
     * `push` is Payload's dev convenience: it diffs the schema and alters the
     * database on boot. Wonderful locally, unacceptable against a live database,
     * where it can drop a column to match a rename. In production the adapter
     * disables it anyway; pinning it to the environment makes the rule visible
     * rather than inherited.
     *
     * The consequence is the one thing to remember: after changing a collection,
     * run `npm run migrate:create <name>` and commit the result, or the next
     * deploy will build fine and then fail at runtime on a missing column.
     */
    push: process.env.NODE_ENV !== 'production',
  }),
  secret: process.env.PAYLOAD_SECRET,
  /**
   * Vercel sets VERCEL_PROJECT_PRODUCTION_URL on every deployment, so the app
   * has a correct absolute origin without anyone remembering to configure one.
   * Needed for the links in emailed sign-in messages, which are useless relative.
   */
  serverURL:
    process.env.NEXT_PUBLIC_SERVER_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined),
  /**
   * Cookie auth is only honoured for requests from these origins, which is what
   * stops another site from riding a member's session. Verified: a request with
   * a hostile Origin and a valid cookie resolves to no user.
   *
   * Every domain the app is served from must be listed, including Vercel
   * preview URLs if you sign in on them.
   */
  csrf: [
    process.env.NEXT_PUBLIC_SERVER_URL,
    'https://ecommharvest.com',
    'https://www.ecommharvest.com',
    'https://app.ecommharvest.com',
    // The Vercel deployment. Named explicitly as well as picked up from the
    // environment below, so signing in there never depends on which Vercel
    // variables happen to be present.
    'https://ecommharvest.vercel.app',
    'https://ecommharvest-git-claude-build-publish-ver-e2fa5e-love-marketing.vercel.app',
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    // The stable per-branch alias. Distinct from VERCEL_URL, which changes with
    // every deployment — without this, a branch preview you sign in on works
    // until the next push and then silently does not.
    process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined,
  ].filter((origin): origin is string => Boolean(origin)),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  sharp,
  plugins: [...storagePlugins],
  upload: {
    limits: { fileSize: 25_000_000 }, // 25MB — worksheets and images, not video
  },
})
