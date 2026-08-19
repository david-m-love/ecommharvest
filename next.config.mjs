import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Course video is served by Cloudflare Stream, so Next only handles images.
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.cloudflarestream.com' }] },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
