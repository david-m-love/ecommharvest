import type { Metadata } from 'next'
import React from 'react'

import { readGhlBlock } from '@/lib/ghl-block'

export const metadata: Metadata = {
  title: 'You’re registered',
  description:
    'Your seat is saved for the Q4 Revenue Playbook masterclass on Thursday, September 10 at 11:00 AM MT.',
  robots: { index: false, follow: false },
}

/**
 * Serves the same thank-you block that gets pasted into GoHighLevel, for the
 * same reason as the landing page: one source, so a proof cannot disagree with
 * what ships. Edit `ghl/src/thanks.html` and re-run `npm run ghl:build`.
 */
export default async function ThanksPage() {
  const block = await readGhlBlock('thanks-WITH-CSS.html')
  return <div dangerouslySetInnerHTML={{ __html: block }} />
}
