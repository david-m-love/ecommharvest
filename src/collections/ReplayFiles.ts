import type { CollectionConfig } from 'payload'

import { refuseIfUploadsWouldVanish } from './Media'
import { isAdmin } from '@/lib/access'
import { can } from '@/lib/capabilities'
import { memberCanRead } from '@/lib/community-access'

const moderator = ({ req }: { req: { user?: unknown } }) =>
  isAdmin(req.user as never) || can(req.user as never, 'community:moderate')

/**
 * The files that go with a replay: worksheets, templates, a transcript.
 *
 * **Its own collection, and not the Media library, because Media is public.**
 * `Media` answers to anybody, which is right for a logo on a sales page and
 * wrong for a worksheet a member paid to receive: anyone with the address could
 * download it, and the address of a file is the sort of thing that ends up in a
 * forwarded email. Files here are readable only by someone with a live
 * membership (or a moderator), and the stored address points at this site's own
 * route, which checks that on every request, not at the storage provider.
 *
 * The file types are a short list on purpose. No HTML and no SVG, which a
 * browser would run if opened directly from the site's own address.
 */
export const ReplayFiles: CollectionConfig = {
  slug: 'replay-files',
  labels: { singular: 'Replay file', plural: 'Replay files' },
  admin: {
    group: 'Community',
    defaultColumns: ['filename', 'mimeType', 'filesize'],
    description: 'Private downloads for replays. Only members can open these.',
    hidden: ({ user }) => !isAdmin(user) && !can(user, 'community:moderate'),
  },
  access: {
    read: memberCanRead(),
    create: moderator,
    update: moderator,
    delete: moderator,
  },
  hooks: { beforeChange: [refuseIfUploadsWouldVanish] },
  upload: {
    mimeTypes: [
      'application/pdf',
      'application/zip',
      'text/csv',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
    ],
  },
  fields: [],
}
