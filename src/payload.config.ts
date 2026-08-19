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
import { Progress } from './collections/Progress'
import { Registrations } from './collections/Registrations'
import { Users } from './collections/Users'

const dirname = path.dirname(fileURLToPath(import.meta.url))

if (!process.env.DATABASE_URI) {
  throw new Error('DATABASE_URI is not set. Copy .env.example to .env and fill it in.')
}
if (!process.env.PAYLOAD_SECRET) {
  throw new Error('PAYLOAD_SECRET is not set. Copy .env.example to .env and fill it in.')
}

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
  },
  collections: [
    Courses,
    Modules,
    Lessons,
    Users,
    Entitlements,
    Progress,
    Registrations,
    Media,
    AuditLog,
  ],
  editor: lexicalEditor(),
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI },
  }),
  secret: process.env.PAYLOAD_SECRET,
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL,
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
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
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
