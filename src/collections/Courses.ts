import type { CollectionConfig } from 'payload'

import { adminOnly, publishedOrAdmin } from '@/lib/access'
import { slugField } from '@/lib/slug'

export const Courses: CollectionConfig = {
  slug: 'courses',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
  },
  // drafts give us a real publish workflow: build a course over days, then ship it.
  versions: { drafts: true },
  access: { read: publishedOrAdmin, create: adminOnly, update: adminOnly, delete: adminOnly },
  fields: [
    { name: 'title', type: 'text', required: true },
    ...slugField(),
    {
      name: 'subtitle',
      type: 'text',
      admin: { description: 'One line under the title in the member area.' },
    },
    { name: 'excerpt', type: 'textarea', admin: { description: 'Used on cards and previews.' } },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    {
      name: 'description',
      type: 'richText',
      admin: { description: 'Full description shown on the course overview.' },
    },
  ],
}
