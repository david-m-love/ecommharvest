import type { Field } from '@measured/puck'

/**
 * A "choose an image" field for the builder.
 *
 * Puck's `external` field renders a searchable picker modal, so this reads the
 * Media library over the REST API and stores just what a block needs to render:
 * the URL and the alt text. Storing the URL rather than a media id is
 * deliberate — a published page then needs no join to render, which is what
 * keeps `/p/<slug>` a single query.
 *
 * The trade: renaming or deleting a media file leaves a stale URL on any page
 * using it. Acceptable for a small site, and the alternative — resolving ids at
 * render time — costs a query per image on every page view.
 *
 * Uploading happens in the admin under Media. That is one extra hop, and the
 * honest reason is that an upload widget inside the canvas is a lot of moving
 * parts for something done a handful of times.
 */

export type PickedImage = { url?: string; alt?: string } | null

type MediaDoc = {
  id: number
  url?: string
  filename?: string
  alt?: string
  mimeType?: string
  filesize?: number
  createdAt?: string
}

const kb = (bytes?: number) => (bytes ? `${Math.round(bytes / 1024)} KB` : '—')

/**
 * Typed to allow `undefined` as well as `null`: every block prop that takes an
 * image is optional, so Puck expects `Field<PickedImage | undefined>` and a
 * narrower type will not assign.
 */
export const imageField = (label: string, description?: string): Field<PickedImage | undefined> =>
  ({
    type: 'external',
    label,
    placeholder: 'Choose an image',
    showSearch: true,
    ...(description ? { metadata: { description } } : {}),

    /**
     * Images only. The Media collection also holds PDFs and worksheets used as
     * lesson attachments, and offering those here would only produce broken
     * pictures.
     */
    fetchList: async ({ query }) => {
      const params = new URLSearchParams({
        limit: '100',
        sort: '-createdAt',
        depth: '0',
        'where[mimeType][like]': 'image',
      })
      if (query) params.set('where[filename][like]', query)

      try {
        const res = await fetch(`/api/media?${params.toString()}`, { credentials: 'include' })
        if (!res.ok) return null
        const body = (await res.json()) as { docs?: MediaDoc[] }
        return (body.docs || []).filter((d) => d.url)
      } catch {
        // Returning null makes Puck show its own empty state rather than
        // throwing inside the modal and taking the editor down with it.
        return null
      }
    },

    // What the picker table shows.
    mapRow: (item: MediaDoc) => ({
      Image: item.filename || String(item.id),
      Description: item.alt || '—',
      Size: kb(item.filesize),
    }),

    // What actually gets stored on the block.
    mapProp: (item: MediaDoc) => ({ url: item.url, alt: item.alt || item.filename || '' }),

    getItemSummary: (item) => (item?.alt || item?.url?.split('/').pop() || 'Image'),
  }) as Field<PickedImage | undefined>
