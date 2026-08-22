import type { CollectionBeforeChangeHook, CollectionBeforeDeleteHook, CollectionConfig } from 'payload'
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

/**
 * Does this page's JSON point at this file?
 *
 * A full URL is specific enough to look for as-is. A bare filename is not:
 * deleting `logo.png` must not report `old-logo.png` as a use of it, so it only
 * counts after a slash or a quote and before the end of the JSON string.
 */
const mentions = (haystack: string, needle: string) => {
  if (needle.includes('/')) return haystack.includes(needle)
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`[/"]${escaped}(?=["?])`).test(haystack)
}

/**
 * Refuses to delete a file that a page, course or lesson is still using.
 *
 * Builder blocks store an image's **URL**, not a link to the media record — which
 * is what lets a page render without a database lookup per image, and what makes
 * a delete dangerous: nothing in the database connects the two, so removing the
 * file leaves a live page pointing at a URL that now 404s. Payload allows it
 * happily, and the first anyone hears about it is a broken logo on the home page.
 *
 * The upload fields elsewhere fail differently and just as quietly: Payload
 * blanks the reference, so a course loses its cover and a lesson loses a
 * worksheet its editor believes is still attached.
 *
 * So the delete is refused, and the message names what is using the file. The
 * fix is always the same — swap the image on those pages first, then delete —
 * and it is a fix that can be made without a developer.
 */
const refuseIfStillInUse: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const doc = await req.payload
    .findByID({ collection: 'media', id, depth: 0, req, overrideAccess: true })
    .catch(() => null)
  if (!doc) return

  /** Every address this one file answers to, resized versions included. */
  const needles: string[] = []
  const add = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) needles.push(value.trim())
  }
  add(doc.url)
  add(doc.filename)
  for (const size of Object.values(doc.sizes || {})) {
    add(size?.url)
    add(size?.filename)
  }

  const used: string[] = []

  if (needles.length > 0) {
    const pages = await req.payload.find({
      collection: 'pages',
      depth: 0,
      pagination: false,
      req,
      overrideAccess: true,
    })
    for (const page of pages.docs) {
      if (!page.content) continue
      const json = JSON.stringify(page.content)
      if (needles.some((needle) => mentions(json, needle))) {
        used.push(`the page “${page.title}” (/p/${page.slug})`)
      }
    }
  }

  const styles = await req.payload
    .findGlobal({ slug: 'site-styles', depth: 0, req, overrideAccess: true })
    .catch(() => null)
  if (styles?.logo && String(styles.logo) === String(id)) {
    used.push('the site logo in Site Styles')
  }

  const courses = await req.payload.find({
    collection: 'courses',
    where: { coverImage: { equals: id } },
    depth: 0,
    pagination: false,
    req,
    overrideAccess: true,
  })
  for (const course of courses.docs) used.push(`the cover image of “${course.title}”`)

  const lessons = await req.payload.find({
    collection: 'lessons',
    where: { 'attachments.file': { equals: id } },
    depth: 0,
    pagination: false,
    req,
    overrideAccess: true,
  })
  for (const lesson of lessons.docs) used.push(`an attachment on the lesson “${lesson.title}”`)

  if (used.length === 0) return

  const list = used.slice(0, 6).join(', ')
  const more = used.length > 6 ? `, and ${used.length - 6} more` : ''
  throw new APIError(
    `“${doc.filename || 'This file'}” is still in use by ${list}${more}. ` +
      'Deleting it would leave a broken image there. Change the image in those places first, ' +
      'then delete this file.',
    400,
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
  hooks: {
    beforeChange: [refuseIfUploadsWouldVanish],
    beforeDelete: [refuseIfStillInUse],
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
