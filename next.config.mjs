import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Course video is served by Cloudflare Stream, so Next only handles images.
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.cloudflarestream.com' }] },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // The lesson player embeds Cloudflare Stream in an iframe, so this
          // cannot be DENY — but nothing here may be framed by a third party.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        // Member and admin pages must never be cached by a shared proxy.
        source: '/:path(learn|members)/:rest*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
      {
        source: '/masterclass.ics',
        headers: [
          { key: 'Content-Type', value: 'text/calendar; charset=utf-8' },
          { key: 'Content-Disposition', value: 'attachment; filename="q4-masterclass.ics"' },
        ],
      },
    ]
  },

  async redirects() {
    return [
      // The static build served these as .html; keep those URLs working.
      { source: '/index.html', destination: '/masterclass', permanent: true },
      { source: '/privacy.html', destination: '/privacy', permanent: true },
      { source: '/terms.html', destination: '/terms', permanent: true },
      { source: '/thanks.html', destination: '/masterclass/thanks', permanent: true },
      { source: '/thanks', destination: '/masterclass/thanks', permanent: true },
    ]
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
