import { postgresAdapter } from '@payloadcms/db-postgres'
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

export default buildConfig({
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
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  sharp,
  plugins: [...storagePlugins],
  upload: {
    limits: { fileSize: 25_000_000 }, // 25MB — worksheets and images, not video
  },
})
