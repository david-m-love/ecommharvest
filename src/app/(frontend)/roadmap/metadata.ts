import type { Metadata } from 'next'

import { builderMetadata, loadBuilderPage } from '@/lib/builder-page'
import { ROADMAP_SOCIAL } from '@/lib/roadmap'

/**
 * Metadata for the three Roadmap pages.
 *
 * The page title is set as `absolute` so the site-wide "%s — eCommHarvest"
 * template is not added to it. The copy deck's titles already end in
 * "| eCommHarvest" and it forbids dashes in meta tags, so the template would
 * both repeat the brand and put an em dash into the title.
 */
export const roadmapMetadata = async (slug: string, fallback: Metadata, noindex = false): Promise<Metadata> => {
  const meta = builderMetadata(await loadBuilderPage(slug), fallback, ROADMAP_SOCIAL)
  const title = typeof meta.title === 'string' ? { absolute: meta.title } : meta.title

  /**
   * The share card's alt text joins the title and the price line with an em
   * dash, in the code shared by every page. The deck forbids dashes in alt text
   * as well, so for these pages it is rewritten rather than the shared code
   * changed under every other page.
   */
  const images = [meta.openGraph?.images ?? []].flat().map((image) =>
    typeof image === 'object' && 'alt' in image && typeof image.alt === 'string'
      ? { ...image, alt: image.alt.replace(/\s[\u2013\u2014]\s/g, ' · ') }
      : image,
  )

  return {
    ...meta,
    title,
    openGraph: { ...meta.openGraph, images },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  }
}
