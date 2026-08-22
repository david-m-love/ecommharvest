import NextImage from 'next/image'
import React from 'react'

import type { PickedImage } from './ImagePicker'

/**
 * An image inside a block: resized, and with its space reserved.
 *
 * Two problems it fixes, both invisible on a fast laptop and obvious on a phone:
 *
 *  1. **The page jumped.** A plain `<img>` with no dimensions has no size until
 *     it arrives, so the header grew as the logo loaded and pushed the whole page
 *     down. Giving the browser the real pixel dimensions lets it hold the space
 *     from the first paint. The CSS still decides the displayed size — these are
 *     an aspect ratio, not a layout instruction.
 *  2. **A 2000px logo was downloaded to be shown at 41px.** Next's optimiser
 *     serves a version scaled for the device, in a modern format, from a cache —
 *     for a logo that is the difference between a 300KB PNG and about 4KB.
 *
 * Falls back to a plain `<img>` when the dimensions are unknown, which is the
 * case for images picked before the builder started recording them. Next's
 * optimiser requires width and height, and a broken image would be a worse
 * outcome than an unoptimised one.
 */
/**
 * The address to hand the optimiser, or null if it must not be handed one.
 *
 * Two traps, both of which cost a whole page rather than one image, because
 * `next/image` *throws* on a source it cannot accept and a throw during render
 * takes the page down with it:
 *
 *  1. **Payload stores absolute URLs** when a server URL is configured, so this
 *     app's own uploads arrive as `http://localhost:3000/api/media/file/x.png`
 *     rather than `/api/media/file/x.png`. To `next/image` that is a remote host
 *     — and "localhost" is not in `remotePatterns`, so the builder canvas died
 *     the moment an image was chosen. Reduced to a path it is same-origin again,
 *     which also survives preview deployments and the two production hostnames
 *     without any of them being listed anywhere.
 *  2. **Anything else remote** is only safe if `next.config.mjs` allows it.
 *     Uploads live in Vercel Blob in production; a URL from anywhere else falls
 *     back to a plain `<img>`, which is unoptimised and works, rather than a
 *     thrown error that does not.
 */
const optimisable = (raw: string): string | null => {
  if (raw.startsWith('/')) return raw
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.pathname.startsWith('/api/media/file/')) return `${url.pathname}${url.search}`
  if (url.hostname.endsWith('.public.blob.vercel-storage.com')) return raw
  return null
}

export function BlockImage({
  image,
  fallbackAlt,
  className,
  sizes,
  priority,
}: {
  image: PickedImage | undefined
  /** Used when the image carries no alt of its own — a name, usually. */
  fallbackAlt?: string
  className?: string
  /**
   * How wide the image will actually be displayed, so the optimiser can pick a
   * size. Roughly right is enough; wrong by a lot means a needlessly large file.
   */
  sizes?: string
  /**
   * For images in the first screenful — the header logo. Without it Next lazy
   * loads, which delays the one image a visitor sees immediately.
   */
  priority?: boolean
}) {
  if (!image?.url) return null
  const alt = image.alt || fallbackAlt || ''
  const src = optimisable(image.url)

  if (!src || !image.width || !image.height) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image.url} alt={alt} className={className} />
  }

  return (
    <NextImage
      src={src}
      alt={alt}
      width={image.width}
      height={image.height}
      className={className}
      sizes={sizes}
      priority={priority}
      /**
       * No inline styles, deliberately.
       *
       * The obvious-looking `style={{ height: 'auto' }}` — which is what Next's
       * own docs suggest for a responsive image — silently broke every logo size
       * setting, because an inline style outranks a stylesheet: the header's
       * `height: var(--logo-h)` lost to it and the logo rendered at its own pixel
       * height instead. Extra large looked identical to small.
       *
       * The stylesheet already sizes these images (`.brand img`, `.host img`),
       * and it did so when they were plain `<img>` tags. The width and height
       * attributes above give the browser the aspect ratio it needs to hold the
       * space; the CSS keeps deciding what the size actually is.
       */
    />
  )
}
