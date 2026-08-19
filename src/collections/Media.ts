import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/lib/access'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { defaultColumns: ['filename', 'alt', 'mimeType', 'filesize'] },
  access: {
    // Cover images appear on public sales pages, so reads are public.
    read: () => true,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
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
