import type { CollectionConfig } from 'payload'

import { isAdmin } from '@/lib/access'

/**
 * One row per user per lesson. Powers "resume where you left off" and the
 * drop-off reporting that tells us which lesson loses people.
 */
export const Progress: CollectionConfig = {
  slug: 'progress',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'lesson', 'completedAt', 'lastPositionSeconds', 'updatedAt'],
    group: 'People',
  },
  access: {
    read: ({ req }) => {
      if (isAdmin(req.user)) return true
      if (!req.user) return false
      return { user: { equals: req.user.id } }
    },
    // Members write their own progress; the route handler pins `user` to the
    // session, so a member cannot forge progress for someone else.
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => {
      if (isAdmin(req.user)) return true
      if (!req.user) return false
      return { user: { equals: req.user.id } }
    },
    delete: ({ req }) => isAdmin(req.user),
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'lesson', type: 'relationship', relationTo: 'lessons', required: true, index: true },
    { name: 'course', type: 'relationship', relationTo: 'courses', index: true },
    { name: 'lastPositionSeconds', type: 'number', defaultValue: 0 },
    { name: 'completedAt', type: 'date' },
  ],
}
