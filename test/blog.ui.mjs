/**
 * The blog: writing one, reading one, and everything that points at it.
 *
 *   npm run dev   (in another terminal, migrated and seeded)
 *   npm run test:blog
 *
 * A blog is more surface than it looks — an index, an article, a feed, a
 * sitemap, structured data, a draft that must stay private, and a rich-text
 * renderer that turns whatever the editor produced into the site's own
 * typography. Each of those fails quietly and separately, so each is checked
 * here.
 *
 * The renderer gets the most attention. It walks a tree of nodes from a database
 * column, and the failure that matters is not a crash — it is a paragraph
 * silently disappearing because a node type was not recognised.
 */

import { chromium } from 'playwright'
import sharp from 'sharp'

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'
const ADMIN = process.env.SEED_ADMIN_EMAIL || 'david@lovemarketing.digital'
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'change-me-locally-8f2a'

let passed = 0
let failed = 0
const check = (ok, label, detail = '') => {
  console.log(`${ok ? ' ok ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`)
  ok ? passed++ : failed++
}

const stamp = Date.now().toString(36)
const MARK = `blog-${stamp}`

/** A Lexical body using every feature the renderer claims to support. */
const base = { version: 1, format: '', indent: 0, direction: 'ltr' }
const text = (value, format = 0) => ({
  type: 'text',
  text: value,
  format,
  style: '',
  mode: 'normal',
  detail: 0,
  version: 1,
})
const body = (uploadId) => ({
  root: {
    type: 'root',
    ...base,
    children: [
      { type: 'paragraph', ...base, children: [text(`opening-${MARK}`)] },
      { type: 'heading', ...base, tag: 'h2', children: [text(`section-${MARK}`)] },
      {
        type: 'paragraph',
        ...base,
        children: [
          text('plain then '),
          text(`bold-${MARK}`, 1),
          text(' then '),
          text(`italic-${MARK}`, 2),
        ],
      },
      {
        type: 'list',
        ...base,
        listType: 'bullet',
        start: 1,
        tag: 'ul',
        children: [
          { type: 'listitem', ...base, value: 1, children: [text(`bullet-one-${MARK}`)] },
          { type: 'listitem', ...base, value: 2, children: [text(`bullet-two-${MARK}`)] },
        ],
      },
      { type: 'quote', ...base, children: [text(`quoted-${MARK}`)] },
      {
        type: 'paragraph',
        ...base,
        children: [
          {
            type: 'link',
            ...base,
            fields: { linkType: 'custom', url: 'go.ecommharvest.com/register', newTab: false },
            children: [text(`linked-${MARK}`)],
          },
        ],
      },
      // An h1 inside the body: must be demoted, since the title is the page's h1.
      { type: 'heading', ...base, tag: 'h1', children: [text(`demoted-${MARK}`)] },
      // A node type nothing knows about. Its words must survive.
      {
        type: 'some-future-node',
        ...base,
        children: [{ type: 'paragraph', ...base, children: [text(`unknown-node-${MARK}`)] }],
      },
      ...(uploadId
        ? [{ type: 'upload', ...base, relationTo: 'media', value: uploadId }]
        : []),
      { type: 'horizontalrule', ...base },
    ],
  },
})

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
)
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()

await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' })
await page.fill('#field-email', ADMIN)
await page.fill('#field-password', PASSWORD)
await page.click('button[type=submit]')
await page.waitForURL(/\/admin(?!\/login)/, { timeout: 90_000 })

// --- writing one --------------------------------------------------------

console.log('writing a post')

const cover = await ctx.request.post(`${BASE}/api/media`, {
  headers: { Origin: BASE },
  multipart: {
    file: {
      name: `cover-${stamp}.png`,
      mimeType: 'image/png',
      buffer: await sharp({
        create: { width: 1200, height: 675, channels: 4, background: { r: 201, g: 145, b: 50, alpha: 1 } },
      })
        .png()
        .toBuffer(),
    },
    _payload: JSON.stringify({ alt: `cover for ${MARK}` }),
  },
})
const coverDoc = (await cover.json().catch(() => ({}))).doc
check(Boolean(coverDoc?.id), 'a cover image', `${coverDoc?.width}×${coverDoc?.height}`)

const inline = await ctx.request.post(`${BASE}/api/media`, {
  headers: { Origin: BASE },
  multipart: {
    file: {
      name: `inline-${stamp}.png`,
      mimeType: 'image/png',
      buffer: await sharp({
        create: { width: 800, height: 400, channels: 4, background: { r: 22, g: 50, b: 79, alpha: 1 } },
      })
        .png()
        .toBuffer(),
    },
    _payload: JSON.stringify({ alt: `inline-image-${MARK}` }),
  },
})
const inlineDoc = (await inline.json().catch(() => ({}))).doc

const created = await ctx.request.post(`${BASE}/api/posts`, {
  headers: { Origin: BASE, 'Content-Type': 'application/json' },
  data: {
    title: `Test post ${MARK}`,
    excerpt: `excerpt-${MARK}`,
    author: 'David Love',
    cover: coverDoc.id,
    body: body(inlineDoc?.id),
    status: 'draft',
  },
})
const post = (await created.json().catch(() => ({}))).doc
check(Boolean(post?.id), 'the post saved', `id ${post?.id}`)
check(Boolean(post?.slug), 'and got a URL from its title', post?.slug)

// --- a draft is private -------------------------------------------------

console.log('\na draft is private')
const anon = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const anonPage = await anon.newPage()
let res = await anonPage.goto(`${BASE}/blog/${post.slug}`, { waitUntil: 'domcontentloaded' })
check(res?.status() === 404, 'a draft 404s for the public', `${res?.status()}`)

res = await anonPage.goto(`${BASE}/blog`, { waitUntil: 'domcontentloaded' })
const draftIndex = await anonPage.content()
check(!draftIndex.includes(MARK), 'and does not appear on the index')

const feedBefore = await anon.request.get(`${BASE}/blog/rss.xml`)
check(!(await feedBefore.text()).includes(MARK), 'nor in the feed')

const teamView = await page.goto(`${BASE}/blog/${post.slug}`, { waitUntil: 'domcontentloaded' })
check(teamView?.status() === 200, 'but the team can read it', `${teamView?.status()}`)
check(
  (await page.locator('text=Draft preview').count()) > 0,
  'and is told it is a draft',
)

// --- publish -------------------------------------------------------------

console.log('\npublished')
const published = await ctx.request.patch(`${BASE}/api/posts/${post.id}`, {
  headers: { Origin: BASE, 'Content-Type': 'application/json' },
  data: { status: 'published' },
})
const live = (await published.json().catch(() => ({}))).doc
check(live?.status === 'published', 'the post publishes', live?.status)
check(Boolean(live?.publishedAt), 'and is dated automatically', live?.publishedAt?.slice(0, 10))

res = await anonPage.goto(`${BASE}/blog/${post.slug}`, { waitUntil: 'load' })
check(res?.status() === 200, 'a visitor can read it', `${res?.status()}`)
const html = await anonPage.content()

// --- the rich text ------------------------------------------------------

console.log('\nwhat the writing turned into')
const article = async (selector) => anonPage.locator(selector).count()

check(await article(`h1:has-text("Test post ${MARK}")`), 'the title is the page heading')
check(await article(`.articlebody p:has-text("opening-${MARK}")`), 'paragraphs render')
check(await article(`.articlebody h2:has-text("section-${MARK}")`), 'headings render')
check(await article(`.articlebody strong:has-text("bold-${MARK}")`), 'bold renders as bold')
check(await article(`.articlebody em:has-text("italic-${MARK}")`), 'italic renders as italic')
check((await article(`.articlebody ul li`)) >= 2, 'lists render as lists')
check(await article(`.articlebody blockquote:has-text("quoted-${MARK}")`), 'quotes render')
check(await article('.articlebody hr'), 'a divider renders')

/**
 * The h1 inside the body is demoted. Two h1s on a page make the outline
 * ambiguous for search engines and for anyone navigating by heading.
 */
check((await article('h1')) === 1, 'there is exactly one h1 on the page')
check(await article(`.articlebody h2:has-text("demoted-${MARK}")`), 'an h1 in the body becomes an h2')

/** The one that matters most: unknown nodes must not eat someone's writing. */
check(
  html.includes(`unknown-node-${MARK}`),
  'a node type the renderer does not know still shows its words',
)

const linkHref = await anonPage.locator(`a:has-text("linked-${MARK}")`).getAttribute('href')
check(
  linkHref === 'https://go.ecommharvest.com/register',
  'a link typed without https:// still leaves the site',
  `${linkHref}`,
)

if (inlineDoc?.id) {
  check(await article('.articleimage img'), 'an image dropped into the article renders')
  check(
    await article(`.articleimage figcaption:has-text("inline-image-${MARK}")`),
    'with its alt text as the caption',
  )
}

check(await article(`.articlecover img`), 'the cover image is at the top')
check(await article(`.article-meta:has-text("David Love")`), 'the byline shows')
check(await article('.article-meta:has-text("min read")'), 'and a reading time')

/**
 * The blog's routes are written in code, not built in the builder, so they have
 * no Header block to carry the logo and the menu. Most people who ever read an
 * article arrive from a search result having never seen the site, and a page
 * with no logo and no way onward wastes them.
 */
check(await article('header.topbar .brand'), 'the article carries the site header')
check(await article('footer .foot-nav a[href="/privacy"]'), 'and the footer with the policies')

// --- the index, the feed, the sitemap -----------------------------------

console.log('\neverything that points at it')
await anonPage.goto(`${BASE}/blog`, { waitUntil: 'load' })
check(
  (await anonPage.locator(`.postcard:has-text("Test post ${MARK}")`).count()) > 0,
  'it is on the index',
)
check(
  (await anonPage.locator(`.postcard-excerpt:has-text("excerpt-${MARK}")`).count()) > 0,
  'with the excerpt, which is what makes anyone open it',
)
check((await anonPage.locator('.postcard-cover img').count()) > 0, 'and its cover')
check((await anonPage.locator('header.topbar .brand').count()) > 0, 'the index carries the site header too')

const feed = await anon.request.get(`${BASE}/blog/rss.xml`)
const xml = await feed.text()
check(feed.status() === 200, 'the feed answers', `${feed.status()}`)
check(
  (feed.headers()['content-type'] || '').includes('rss+xml'),
  'as a feed, not as a web page',
  feed.headers()['content-type'],
)
check(xml.includes(`Test post ${MARK}`), 'and carries the post')
check(xml.includes(`${BASE}/blog/${post.slug}`), 'with a full address a reader can follow')

const sitemap = await (await anon.request.get(`${BASE}/sitemap.xml`)).text()
check(sitemap.includes(`/blog/${post.slug}`), 'the sitemap lists the post')
check(sitemap.includes('/blog<'), 'and the blog itself')

check(html.includes('"@type":"BlogPosting"'), 'the post carries structured data for search')

// --- on the home page ---------------------------------------------------

console.log('\nthe block that puts it on another page')
const withBlock = await ctx.request.post(`${BASE}/api/pages`, {
  headers: { Origin: BASE, 'Content-Type': 'application/json' },
  data: {
    title: `blogblock-${stamp}`,
    status: 'published',
    content: {
      root: {},
      content: [
        {
          type: 'PostList',
          props: { id: 'pl1', eyebrow: 'From the blog', heading: `latest-${MARK}`, count: 3, ctaLabel: 'All posts' },
        },
      ],
    },
  },
})
const blockPage = (await withBlock.json()).doc
await anonPage.goto(`${BASE}/p/${blockPage.slug}`, { waitUntil: 'load' })
check(
  (await anonPage.locator(`.postcards .postcard:has-text("Test post ${MARK}")`).count()) > 0,
  'the newest posts appear on a built page',
)
check(
  (await anonPage.locator('a[href="/blog"]').count()) > 0,
  'with a way through to the rest',
)

// --- on a phone ----------------------------------------------------------

console.log('\non a phone')
await anonPage.setViewportSize({ width: 414, height: 900 })
await anonPage.goto(`${BASE}/blog/${post.slug}`, { waitUntil: 'load' })
await anonPage.waitForTimeout(800)
const overflow = await anonPage.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth + 1,
)
check(!overflow, 'the article does not push the page sideways')
const measure = await anonPage.evaluate(() => {
  const p = document.querySelector('.articlebody p')
  const img = document.querySelector('.articlecover img')
  return {
    font: p ? parseFloat(getComputedStyle(p).fontSize) : null,
    width: p ? Math.round(p.getBoundingClientRect().width) : null,
    cover: img ? Math.round(img.getBoundingClientRect().width) : null,
  }
})
check(measure.font >= 16, 'the words are big enough to read', `${measure.font}px`)
check(measure.cover <= 414, 'and the cover fits the screen', `${measure.cover}px`)

// --- tidy up -------------------------------------------------------------

await ctx.request.delete(`${BASE}/api/pages/${blockPage.id}`, { headers: { Origin: BASE } })
await ctx.request.delete(`${BASE}/api/posts/${post.id}`, { headers: { Origin: BASE } })
if (coverDoc?.id) await ctx.request.delete(`${BASE}/api/media/${coverDoc.id}`, { headers: { Origin: BASE } })
if (inlineDoc?.id) await ctx.request.delete(`${BASE}/api/media/${inlineDoc.id}`, { headers: { Origin: BASE } })

await browser.close()
console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
