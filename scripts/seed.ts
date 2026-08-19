/**
 * Seeds an admin, a test member, and the Q4 Revenue Playbook course.
 *
 *   npx payload run scripts/seed.ts
 *
 * Idempotent: re-running updates rather than duplicating, so it is safe to use
 * as a "reset my dev data" button.
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'david@lovemarketing.digital'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'change-me-locally-8f2a'
const MEMBER_EMAIL = process.env.SEED_MEMBER_EMAIL || 'member@example.com'

type LessonSeed = { title: string; body: string; isPreview?: boolean }
type ModuleSeed = { title: string; summary: string; lessons: LessonSeed[] }

const COURSE = {
  title: 'The Q4 Revenue Playbook',
  slug: 'q4-revenue-playbook',
  subtitle: 'Build the quarter that decides your year.',
  excerpt:
    'The promotional calendar, the offers, the flows, and the paid social plan — built once, in order, before the holiday rush.',
}

const MODULES: ModuleSeed[] = [
  {
    title: 'Your Promotional Calendar',
    summary: 'Decide what runs when, so November is execution rather than invention.',
    lessons: [
      {
        title: 'Mapping the quarter on one page',
        isPreview: true,
        body: 'Every promotion, every send, every creative deadline on a single page. If it does not fit on one page you will not follow it.',
      },
      {
        title: 'Choosing your anchor promotions',
        body: 'Two or three anchors carry the quarter. Everything else supports them or gets cut.',
      },
      {
        title: 'Setting your build-by date',
        body: 'The date everything must be finished. Working backwards from it is what protects December.',
      },
    ],
  },
  {
    title: 'Offer Strategy and AOV',
    summary: 'Ways to sell that are not simply discounting harder than last year.',
    lessons: [
      {
        title: 'Selling beyond 25% off',
        body: 'Bundles, tiered discounts, gifts with purchase, and thresholds — what each one does to margin and to perceived value.',
      },
      {
        title: 'Engineering a bigger basket',
        body: 'Threshold maths: setting the free-shipping and gift tiers against your real AOV distribution rather than a round number.',
      },
      {
        title: 'Protecting margin while you scale',
        body: 'The discount depth that still leaves you a business in January.',
      },
    ],
  },
  {
    title: 'Email and SMS',
    summary: 'The campaigns and the automated flows that carry the quarter.',
    lessons: [
      { title: 'The Q4 campaign calendar', body: 'Send cadence that increases without burning the list.' },
      {
        title: 'Flows that must exist before October',
        body: 'Welcome, browse abandonment, cart and checkout recovery, post-purchase. In priority order, with the one most stores are missing.',
      },
      { title: 'Segmenting for the season', body: 'Who hears about which offer, and who you deliberately leave out.' },
    ],
  },
  {
    title: 'Paid Social',
    summary: 'Where Meta fits, and why CAC is not decided inside the ad account.',
    lessons: [
      {
        title: 'What your Q4 creative has to say',
        body: 'The three messages that work in a crowded feed, and the ones that quietly waste budget at peak CPMs.',
      },
      {
        title: 'Where spend goes, and when to scale',
        body: 'Which offers deserve budget, and how to avoid bidding against everyone else on the same three days.',
      },
      {
        title: 'Lowering blended CAC',
        body: 'Ads times offer times repeat. How the other two arms make the first one cheaper.',
      },
    ],
  },
  {
    title: 'The Pre-Q4 Fix List',
    summary: 'What to tighten before pouring more money into traffic.',
    lessons: [
      { title: 'Conversion checks', body: 'The handful of on-site issues that cost the most during peak traffic.' },
      { title: 'Retention checks', body: 'Making sure the second order actually happens.' },
    ],
  },
]

/** Lexical needs a document shape, not a bare string. */
const richText = (text: string) => ({
  root: {
    type: 'root' as const,
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [{ type: 'text', text, format: 0, style: '', detail: 0, mode: 'normal', version: 1 }],
      },
    ],
  },
})

const seed = async () => {
  const payload = await getPayload({ config })

  const upsertUser = async (email: string, roles: ('admin' | 'member')[], name: string) => {
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs.length > 0) {
      const doc = await payload.update({
        collection: 'users',
        id: existing.docs[0].id,
        data: { roles, name },
        overrideAccess: true,
      })
      console.log(`  = ${email} (${roles.join(', ')})`)
      return doc
    }
    const doc = await payload.create({
      collection: 'users',
      data: { email, password: ADMIN_PASSWORD, roles, name },
      overrideAccess: true,
    })
    console.log(`  + ${email} (${roles.join(', ')})`)
    return doc
  }

  console.log('Users')
  const admin = await upsertUser(ADMIN_EMAIL, ['admin', 'member'], 'David Love')
  await upsertUser(MEMBER_EMAIL, ['member'], 'Test Member')

  console.log('Course')
  const existingCourse = await payload.find({
    collection: 'courses',
    where: { slug: { equals: COURSE.slug } },
    limit: 1,
    overrideAccess: true,
    draft: true,
  })

  const courseData = {
    ...COURSE,
    description: richText(
      'Built in the order the decisions actually have to be made: calendar first, then offers, then the systems that deliver them.',
    ),
    _status: 'published' as const,
  }

  const course = existingCourse.docs.length
    ? await payload.update({
        collection: 'courses',
        id: existingCourse.docs[0].id,
        data: courseData,
        overrideAccess: true,
      })
    : await payload.create({ collection: 'courses', data: courseData, overrideAccess: true })
  console.log(`  ${existingCourse.docs.length ? '=' : '+'} ${course.title}`)

  for (const mod of MODULES) {
    const existingModule = await payload.find({
      collection: 'modules',
      where: { and: [{ title: { equals: mod.title } }, { course: { equals: course.id } }] },
      limit: 1,
      overrideAccess: true,
      draft: true,
    })
    const moduleData = {
      title: mod.title,
      summary: mod.summary,
      course: course.id,
      _status: 'published' as const,
    }
    const saved = existingModule.docs.length
      ? await payload.update({
          collection: 'modules',
          id: existingModule.docs[0].id,
          data: moduleData,
          overrideAccess: true,
        })
      : await payload.create({ collection: 'modules', data: moduleData, overrideAccess: true })
    console.log(`  ${existingModule.docs.length ? '=' : '+'} ${saved.title}`)

    for (const lesson of mod.lessons) {
      const slug = lesson.title
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
      const existingLesson = await payload.find({
        collection: 'lessons',
        where: { slug: { equals: slug } },
        limit: 1,
        overrideAccess: true,
        draft: true,
      })
      const lessonData = {
        title: lesson.title,
        slug,
        module: saved.id,
        isPreview: Boolean(lesson.isPreview),
        body: richText(lesson.body),
        _status: 'published' as const,
      }
      if (existingLesson.docs.length) {
        await payload.update({
          collection: 'lessons',
          id: existingLesson.docs[0].id,
          data: lessonData,
          overrideAccess: true,
        })
      } else {
        await payload.create({ collection: 'lessons', data: lessonData, overrideAccess: true })
      }
      console.log(`      ${existingLesson.docs.length ? '=' : '+'} ${lesson.title}`)
    }
  }

  // The admin needs an entitlement too, otherwise /learn looks broken for the
  // one person most likely to be testing it.
  const existingEnt = await payload.find({
    collection: 'entitlements',
    where: { and: [{ user: { equals: admin.id } }, { course: { equals: course.id } }] },
    limit: 1,
    overrideAccess: true,
  })
  if (!existingEnt.docs.length) {
    await payload.create({
      collection: 'entitlements',
      data: {
        user: admin.id,
        course: course.id,
        source: 'manual',
        sourceReference: 'seed',
        grantedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    })
    console.log('Entitlement\n  + admin granted access')
  } else {
    console.log('Entitlement\n  = admin already entitled')
  }

  const counts = await Promise.all(
    (['courses', 'modules', 'lessons', 'users', 'entitlements'] as const).map(async (c) => {
      const r = await payload.count({ collection: c, overrideAccess: true })
      return `${c}=${r.totalDocs}`
    }),
  )
  console.log(`\n${counts.join('  ')}`)
  process.exit(0)
}

// Top-level await, not a floating promise: without it Node can exit 0 before
// Payload finishes connecting, and the seed silently does nothing.
try {
  await seed()
} catch (err) {
  console.error('Seed failed:', err)
  process.exit(1)
}
