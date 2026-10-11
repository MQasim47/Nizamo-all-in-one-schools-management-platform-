import { SITE_NAME } from '@/lib/site'

const OG_IMAGE = {
  url: '/opengraph-image.png',
  width: 1200,
  height: 630,
  alt: 'Nizamo — Pakistan ka school, Pakistan ka system',
}

// Next does not deep-merge openGraph/twitter between layout and page, so every marketing page
// builds the full set here. Relative URLs resolve against metadataBase (the root domain).
export function pageMetadata({ title, description, path, absoluteTitle = false, robots }) {
  const shown = absoluteTitle ? title : `${title} — ${SITE_NAME}`
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    ...(robots ? { robots } : {}),
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en_PK',
      title: shown,
      description,
      url: path,
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: shown,
      description,
      images: [OG_IMAGE.url],
    },
  }
}
