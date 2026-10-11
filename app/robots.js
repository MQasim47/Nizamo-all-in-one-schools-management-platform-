import { siteUrl } from '@/lib/site'

export default function robots() {
  const base = siteUrl()
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/school', '/admin', '/login', '/signed-out', '/api/'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
