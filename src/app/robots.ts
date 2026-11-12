import type { MetadataRoute } from 'next';

// Search engines may read the whole shop, but never the admin panel or the form endpoints.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] },
    sitemap: 'https://alaraline.co/sitemap.xml',
    host: 'https://alaraline.co',
  };
}
