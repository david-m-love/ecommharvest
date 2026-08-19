import type { Field } from 'payload'

/** URL-safe slug from arbitrary text. */
export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

/**
 * A slug field that fills itself from another field on create but never
 * silently rewrites itself afterwards — changing a published URL should be a
 * deliberate act, not a side effect of fixing a typo in the title.
 */
export const slugField = (from = 'title'): Field[] => [
  {
    name: 'slug',
    type: 'text',
    required: true,
    unique: true,
    index: true,
    admin: {
      position: 'sidebar',
      description: 'Used in the URL. Auto-filled from the title; safe to edit before publishing.',
    },
    hooks: {
      beforeValidate: [
        ({ data, operation, value }) => {
          if (typeof value === 'string' && value.length > 0) return slugify(value)
          const source = data?.[from]
          if (operation === 'create' && typeof source === 'string') return slugify(source)
          return value
        },
      ],
    },
  },
]
