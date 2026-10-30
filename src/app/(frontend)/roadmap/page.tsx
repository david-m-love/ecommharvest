import type { Metadata } from 'next'

import { ROADMAP_PATH } from '@/lib/roadmap'

import { roadmapMetadata } from './metadata'
import { RoadmapPage } from './RoadmapPage'

const FALLBACK: Metadata = {
  title: 'The Founder Roadmap | eCommHarvest',
  description:
    'A personalized 90-day growth plan for your store, built from your real numbers. Two calls, a written plan, no retainer. $500.',
  alternates: { canonical: ROADMAP_PATH },
}

export const generateMetadata = (): Promise<Metadata> => roadmapMetadata('roadmap', FALLBACK)

/** The short page: the single link in a follow-up email after a discovery call. */
export default function Page() {
  return <RoadmapPage slug="roadmap" />
}
