import type { Metadata } from 'next'

import { roadmapMetadata } from '../metadata'
import { RoadmapPage } from '../RoadmapPage'

const FALLBACK: Metadata = {
  title: 'Welcome to the Founder Roadmap | eCommHarvest',
  // Never indexed: a confirmation page is one people reach after paying.
  robots: { index: false, follow: false },
}

export const generateMetadata = (): Promise<Metadata> => roadmapMetadata('roadmap-thanks', FALLBACK, true)

/** Where the checkout sends somebody after they have paid. Shared by both sales pages. */
export default function Page() {
  return <RoadmapPage slug="roadmap-thanks" />
}
