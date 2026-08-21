import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { adminOnly } from '@/lib/access'
import { can } from '@/lib/capabilities'

/**
 * Refuses an upload that would silently disappear.
 *
 * Vercel's filesystem is ephemeral: without a Blob store, a file uploaded in
 * production writes to disk, appears to work, shows a working thumbnail — and is
 * gone on the next deploy, leaving broken images across every page that used it.
 * That is the worst kind of failure, so it is turned into a refusal with the fix
 * in the message.
 *
 * Locally there is no such problem: disk is disk, so uploads are allowed.
 */
const refuseIfUploadsWouldVanish: CollectionBeforeChangeHook = ({ data, operation }) => {
  if (operation !== 'create') return data
  const ephemeral = Boolean(process.env.VERCEL) && !process.env.BLOB_READ_WRITE_TOKEN
  if (!ephemeral) return data
  throw new APIError(
    'Uploads are not stored yet. In Vercel: Storage → Create Database → Blob, connect it to ' +
      'this project, then redeploy. Without it a file uploads fine and disappears on the next ' +
      'deploy, breaking every image that used it.',
    500,
  )
}

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    defaultColumns: ['filename', 'alt', 'mimeType', 'filesize'],
    group: 'Site',
    description: 'Logos and images. Upload here, then pick them in the page builder.',
  },
  access: {
    // Cover images appear on public sales pages, so reads are public.
    read: () => true,
    // Widened from admin-only: someone who builds pages has to be able to put a
    // logo or a photo on one.
    create: ({ req }) => adminOnly({ req }) || can(req.user, 'media:manage') || can(req.user, 'pages:write'),
    update: ({ req }) => adminOnly({ req }) || can(req.user, 'media:manage') || can(req.user, 'pages:write'),
    delete: ({ req }) => adminOnly({ req }) || can(req.user, 'media:manage'),
  },
  hooks: { beforeChange: [refuseIfUploadsWouldVanish] },
  upload: {
    // Worksheets and templates alongside images — this doubles as lesson attachments.
    mimeTypes: ['image/*', 'application/pdf', 'application/zip', 'text/csv'],
    imageSizes: [
      { name: 'thumbnail', width: 480, height: 270, position: 'centre' },
      { name: 'cover', width: 1280, height: 720, position: 'centre' },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      admin: { description: 'Describe the image for screen readers. Leave blank for files.' },
    },
  ],
}
