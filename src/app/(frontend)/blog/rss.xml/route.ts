import { listPosts, postDate, postPath } from '@/lib/blog'
import { richTextToPlain } from '@/lib/rich-text'
import { absolute } from '@/lib/site-url'

/**
 * The blog as a feed.
 *
 * Worth the thirty lines: a feed is how other people's tools find new posts —
 * an email tool that turns a post into a campaign, a partner's site listing your
 * articles, a reader someone actually uses. None of that can be added later
 * without it, and nothing else on the site provides it.
 *
 * Summaries only, deliberately. A full-text feed invites scraper sites to
 * republish the article and outrank the original.
 */
export const revalidate = 3600

/** XML has five characters that cannot appear raw, and a title will contain them. */
const escape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

export async function GET() {
  const { posts } = await listPosts({ limit: 30 })

  const items = posts
    .map((post) => {
      const url = absolute(postPath(post.slug))
      const date = postDate(post)
      const summary = post.excerpt || richTextToPlain(post.body).slice(0, 300)
      return `    <item>
      <title>${escape(post.title)}</title>
      <link>${escape(url)}</link>
      <guid isPermaLink="true">${escape(url)}</guid>
      ${date ? `<pubDate>${date.toUTCString()}</pubDate>` : ''}
      <description>${escape(summary)}</description>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>eCommHarvest</title>
    <link>${escape(absolute('/blog'))}</link>
    <atom:link href="${escape(absolute('/blog/rss.xml'))}" rel="self" type="application/rss+xml" />
    <description>Practical writing on Q4 planning, offers, email and SMS, and paid social for LDS e-commerce founders.</description>
    <language>en</language>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  })
}
