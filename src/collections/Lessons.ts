import type { CollectionConfig } from 'payload'

import { adminOnly, publishedOrAdmin } from '@/lib/access'
import { slugField } from '@/lib/slug'

export const Lessons: CollectionConfig = {
  slug: 'lessons',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'module', 'videoStatus', '_status', 'updatedAt'],
    group: 'Courses',
  },
  orderable: true,
  versions: { drafts: true },
  // Lesson metadata is readable (it is the curriculum list on the sales page).
  // The video itself is gated by a signed token, not by this rule.
  access: { read: publishedOrAdmin, create: adminOnly, update: adminOnly, delete: adminOnly },
  fields: [
    { name: 'title', type: 'text', required: true },
    ...slugField(),
    {
      name: 'module',
      type: 'relationship',
      relationTo: 'modules',
      required: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'isPreview',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Playable without an entitlement. Use one per course as a teaser.',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Video',
          fields: [
            {
              name: 'videoId',
              type: 'text',
              admin: {
                readOnly: true,
                description: 'Set by the uploader. The provider’s video identifier.',
              },
            },
            {
              name: 'videoStatus',
              type: 'select',
              defaultValue: 'none',
              options: [
                { label: 'No video', value: 'none' },
                { label: 'Uploading', value: 'uploading' },
                { label: 'Processing', value: 'processing' },
                { label: 'Ready', value: 'ready' },
                { label: 'Error', value: 'error' },
              ],
              admin: { readOnly: true },
            },
            {
              name: 'durationSeconds',
              type: 'number',
              admin: { readOnly: true, description: 'Reported by the provider once encoded.' },
            },
          ],
        },
        {
          label: 'Content',
          fields: [
            { name: 'body', type: 'richText' },
            {
              name: 'attachments',
              type: 'array',
              labels: { singular: 'Attachment', plural: 'Attachments' },
              admin: { description: 'Worksheets, templates, swipe files.' },
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'file', type: 'upload', relationTo: 'media', required: true },
              ],
            },
          ],
        },
      ],
    },
  ],
}
