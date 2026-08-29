import type { CollectionConfig } from 'payload'

import { isAdmin } from '@/lib/access'
import { can, requireCapability, requireCapabilityField } from '@/lib/capabilities'
import { slugField } from '@/lib/slug'

/**
 * A blog post.
 *
 * Written here rather than in the page builder, deliberately. The builder is for
 * *pages* — arrangements of sections, where the layout is the work. An article
 * is the opposite: one column of prose where the writing is the work and the
 * layout should never vary. Dragging a block per paragraph would be a worse way
 * to write and would let every post look slightly different from the last.
 *
 * So the body is rich text — headings, bold, links, lists, quotes, images — and
 * `src/lib/rich-text.tsx` renders it into the site's own typography. The result
 * is that every article is laid out identically and nobody has to think about
 * layout to publish one.
 */
export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'publishedAt', 'updatedAt'],
    group: 'Site',
    description: 'Articles at /blog. Written here; the layout is the same for every one.',
    hidden: ({ user }) => !isAdmin(user) && !can(user, 'posts:write'),
  },
  access: {
    /**
     * Published posts are world-readable — that is what a blog is. Drafts are
     * visible only to people who work on them, which is what stops an
     * unfinished post leaking through the REST API.
     */
    read: ({ req }) => {
      if (isAdmin(req.user) || can(req.user, 'posts:write')) return true
      return { status: { equals: 'published' } }
    },
    create: requireCapability('posts:write'),
    update: requireCapability('posts:write'),
    delete: requireCapability('posts:write'),
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'The headline. It is also what Google and a shared link show.' },
    },
    ...slugField('title'),
    {
      name: 'excerpt',
      type: 'textarea',
      maxLength: 300,
      admin: {
        description:
          'One or two sentences. Shown on the blog index, in search results, in the preview when the link is shared, and in the feed. Worth writing properly — it is the only thing most people read.',
      },
    },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Shown at the top of the post, on the index card, and as the picture when the link is shared. Landscape works best.',
      },
    },
    {
      name: 'body',
      type: 'richText',
      admin: {
        description:
          'The article. Headings, bold, links, lists, quotes and images all work and all come out in the site’s own styling.',
      },
    },
    {
      /**
       * The date the post claims, which is not the same as the row's
       * `createdAt`: a post drafted in August and published in October is an
       * October post, and backdating an evergreen piece is a normal thing to
       * want. Ordering and the visible date both come from here.
       */
      name: 'publishedAt',
      label: 'Date',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' },
        description: 'Sorts the blog and shows on the post. Set it forward to date a piece ahead.',
      },
    },
    {
      name: 'author',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Optional byline. Leave blank for none.',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      /**
       * Separate from `update` access, exactly as on Pages: someone can write
       * all day, and putting it in front of customers is a different permission.
       */
      access: {
        create: requireCapabilityField('posts:publish'),
        update: requireCapabilityField('posts:publish'),
      },
      admin: { position: 'sidebar', description: 'Drafts are visible only to your team.' },
    },
    {
      name: 'noindex',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Keep this post out of Google. Leave on while you are still proofing.',
      },
    },
    {
      name: 'updatedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar', readOnly: true },
      hooks: {
        // Stamped server-side rather than sent by the client, so it cannot be
        // forged to blame someone else for a change.
        beforeChange: [({ req }) => req.user?.id],
      },
    },
  ],
  hooks: {
    beforeChange: [
      /**
       * A post published with no date would sort to the bottom of its own blog
       * and show nothing where the date goes. Filled in at the moment of
       * publishing rather than at creation, so a draft written weeks earlier is
       * dated when it actually appears.
       */
      ({ data }) => {
        if (data?.status === 'published' && !data.publishedAt) {
          return { ...data, publishedAt: new Date().toISOString() }
        }
        return data
      },
    ],
  },
}
