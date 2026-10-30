import type { Metadata } from 'next'

import { ROADMAP_PREVIEW_PATH } from '@/lib/roadmap'

import { roadmapMetadata } from '../metadata'
import { RoadmapPage } from '../RoadmapPage'

const FALLBACK: Metadata = {
  title: 'Inside the Founder Roadmap | eCommHarvest',
  description:
    'See sample pages from a Founder Roadmap: the math, the constraint, the 90-day plan, and the seasonal calendar. Built from your real store numbers. $500.',
  alternates: { canonical: ROADMAP_PREVIEW_PATH },
}

export const generateMetadata = (): Promise<Metadata> => roadmapMetadata('roadmap-preview', FALLBACK)

/** The long page: shows the substance and carries the proof. */
export default function Page() {
  return <RoadmapPage slug="roadmap-preview" />
}
