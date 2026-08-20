import type { Metadata } from 'next'
import React from 'react'

import { readGhlBlock } from '@/lib/ghl-block'

export const metadata: Metadata = {
  title: 'Your Q4 Revenue Playbook, Built in 90 Minutes',
  description:
    'Thursday, September 3 at 11:00 AM MT. A free 90-minute masterclass for LDS e-commerce founders. Build your Q4 promotional calendar, offers, email and SMS plan in one sitting — without headaches or sacrificing family time.',
  alternates: { canonical: '/masterclass' },
  // A proof URL serving this copy must not compete with the real page in
  // search. Drop this once this deployment *is* the real page.
  robots: { index: false, follow: false },
}

/**
 * The masterclass landing page.
 *
 * Serves `ghl/blocks/LANDING-PAGE.html` — the exact block pasted into
 * GoHighLevel — rather than a React reimplementation of it. There used to be a
 * React copy here and it drifted: the form came out of the design and the
 * buttons started pointing at funnel step 2, and this page kept showing the old
 * version. Proofing something that isn't what ships is worse than not proofing.
 *
 * Consequence: editing this page means editing `ghl/src/masterclass.html` and
 * re-running `npm run ghl:build`, not editing this file.
 */
export default async function MasterclassPage() {
  const block = await readGhlBlock('LANDING-PAGE.html')
  return <div dangerouslySetInnerHTML={{ __html: block }} />
}
