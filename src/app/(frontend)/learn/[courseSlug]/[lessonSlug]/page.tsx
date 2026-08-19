import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AppBar } from '@/components/AppBar'
import { LessonPlayer } from './LessonPlayer'
import { requireUser } from '@/lib/auth'
import { getCourseTree, getLessonContext, hasCourseAccess, payload } from '@/lib/entitlements'
import type { Media } from '@/payload-types'

type Props = { params: Promise<{ courseSlug: string; lessonSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lessonSlug } = await params
  const context = await getLessonContext(lessonSlug)
  return {
    title: context?.lesson.title || 'Lesson',
    robots: { index: false, follow: false },
  }
}

/** Minimal Lexical renderer: paragraphs and text runs, which is all the seed uses. */
const renderRichText = (value: unknown): string[] => {
  const root = (value as { root?: { children?: unknown[] } })?.root
  if (!root?.children) return []
  return root.children
    .map((node) => {
      const children = (node as { children?: { text?: string }[] }).children || []
      return children.map((c) => c.text || '').join('')
    })
    .filter((text) => text.trim().length > 0)
}

export default async function LessonPage({ params }: Props) {
  const { courseSlug, lessonSlug } = await params
  const user = await requireUser(`/learn/${courseSlug}/${lessonSlug}`)

  const context = await getLessonContext(lessonSlug)
  if (!context) notFound()
  const { lesson, course } = context

  // Guard against a lesson slug from a different course being pasted into this URL.
  if (course.slug !== courseSlug) notFound()

  const hasAccess = await hasCourseAccess(user, course.id)
  const playable = hasAccess || Boolean(lesson.isPreview)

  // Neighbouring lessons, in curriculum order, for prev/next.
  const tree = await getCourseTree(courseSlug)
  const flat = tree ? tree.modules.flatMap((m) => m.lessons) : []
  const index = flat.findIndex((l) => String(l.id) === String(lesson.id))
  const prev = index > 0 ? flat[index - 1] : null
  const next = index >= 0 && index < flat.length - 1 ? flat[index + 1] : null

  const p = await payload()
  const existing = await p.find({
    collection: 'progress',
    where: { and: [{ user: { equals: user.id } }, { lesson: { equals: lesson.id } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const isDone = Boolean(existing.docs[0]?.completedAt)

  const attachments = (lesson.attachments || [])
    .map((row) => ({
      label: row.label,
      file: typeof row.file === 'object' ? (row.file as Media) : null,
    }))
    .filter((row) => row.file?.url)

  const paragraphs = renderRichText(lesson.body)

  return (
    <>
      <AppBar user={user} />
      <main className="shell">
        <div className="pagehead">
          <p className="eyebrow">
            <Link href={`/learn/${course.slug}`} className="plainlink">
              {course.title}
            </Link>
          </p>
          <h1>{lesson.title}</h1>
        </div>

        <div className="player-wrap">
          <div>
            <LessonPlayer
              lessonSlug={lesson.slug}
              playable={playable}
              videoStatus={lesson.videoStatus || 'none'}
              initiallyComplete={isDone}
              title={lesson.title}
            />

            <div className="lessonnav">
              {prev ? (
                <Link href={`/learn/${course.slug}/${prev.slug}`} className="btn btn-ghost">
                  ← {prev.title}
                </Link>
              ) : null}
              {next ? (
                <Link href={`/learn/${course.slug}/${next.slug}`} className="btn btn-ghost">
                  {next.title} →
                </Link>
              ) : null}
            </div>

            {paragraphs.length > 0 && (
              <div className="prose lessonbody">
                {paragraphs.map((text, i) => (
                  <p key={i}>{text}</p>
                ))}
              </div>
            )}
          </div>

          <aside className="sidecol">
            {attachments.length > 0 && (
              <>
                <h4>Downloads</h4>
                <ul className="attachlist">
                  {attachments.map((row, i) => (
                    <li key={i}>
                      <a href={row.file!.url!} download>
                        {row.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <h4 className={attachments.length ? 'spaced' : undefined}>In this course</h4>
            <ul className="attachlist">
              <li>
                <Link href={`/learn/${course.slug}`}>All {flat.length} lessons</Link>
              </li>
            </ul>
          </aside>
        </div>
      </main>
    </>
  )
}
