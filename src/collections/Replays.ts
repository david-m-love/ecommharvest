import type { CollectionConfig } from 'payload'

import { isAdmin } from '@/lib/access'
import { can } from '@/lib/capabilities'
import { memberCanReadPublished } from '@/lib/community-access'
import { replayEmbedUrl } from '@/lib/replay'
import { slugField } from '@/lib/slug'

const moderator = ({ req }: { req: { user?: unknown } }) =>
  isAdmin(req.user as never) || can(req.user as never, 'community:moderate')

/**
 * A recorded call, set out like a lesson: the video, what was covered, and the
 * files that go with it.
 *
 * Deliberately not a `Lesson`. A lesson belongs to a module, in a course, and is
 * unlocked by a course entitlement; a weekly call replay belongs to nothing but
 * the membership, and forcing it into a curriculum would mean inventing a course
 * to hold it. This is the same membership gate as the community, applied to
 * content that arrives one a week.
 *
 * Draft until `published` is ticked, and the read rule enforces that for members
 * too (see `memberCanReadPublished`), so a half-written replay is never visible
 * early by guessing its address.
 */
export const Replays: CollectionConfig = {
  slug: 'replays',
  labels: { singular: 'Replay', plural: 'Replays' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'recordedAt', 'published', 'updatedAt'],
    group: 'Community',
    hidden: ({ user }) => !isAdmin(user) && !can(user, 'community:moderate'),
  },
  access: {
    read: memberCanReadPublished(),
    create: moderator,
    update: moderator,
    delete: moderator,
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 140 },
    ...slugField(),
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Tick to show this replay to members. Until then only the team can see it.',
      },
    },
    {
      name: 'recordedAt',
      type: 'date',
      label: 'Date of the call',
      index: true,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly' },
        description: 'Replays are listed newest first by this date.',
      },
    },
    {
      name: 'videoUrl',
      type: 'text',
      label: 'Video link (YouTube)',
      maxLength: 300,
      // Refused when saved rather than quietly not showing, so whoever pasted a
      // wrong link finds out at once.
      validate: (value: string | null | undefined) =>
        !value || replayEmbedUrl(value) ? true : 'Paste a YouTube link, such as https://youtu.be/…',
      admin: {
        description:
          'An unlisted YouTube video is fine. Anyone who has an unlisted link can watch it, so do not post the link anywhere else.',
      },
    },
    {
      name: 'summary',
      type: 'textarea',
      maxLength: 300,
      admin: { description: 'One or two sentences, shown on the list and at the top of the replay.' },
    },
    {
      name: 'notes',
      type: 'richText',
      label: 'Notes',
      admin: {
        description: 'What was covered: headings, bullets, links and timestamps all work.',
      },
    },
    {
      name: 'attachments',
      type: 'array',
      labels: { singular: 'Download', plural: 'Downloads' },
      admin: {
        description: 'Worksheets, templates, a transcript. Uploaded to a private store: only members can open them.',
      },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'file', type: 'upload', relationTo: 'replay-files', required: true },
      ],
    },
    {
      name: 'thread',
      type: 'relationship',
      relationTo: 'threads',
      admin: {
        position: 'sidebar',
        description: 'Optional. The community thread where this call is discussed; a link appears under the video.',
      },
    },
  ],
}
