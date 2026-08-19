import type { CollectionConfig } from 'payload'

import { adminOnly, publishedOrAdmin } from '@/lib/access'

export const Modules: CollectionConfig = {
  slug: 'modules',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'course', 'updatedAt'],
    group: 'Courses',
  },
  // Payload renders a drag handle in the list view for orderable collections,
  // which is the reordering UI we would otherwise have had to build.
  orderable: true,
  versions: { drafts: true },
  access: { read: publishedOrAdmin, create: adminOnly, update: adminOnly, delete: adminOnly },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    { name: 'summary', type: 'textarea' },
  ],
}
