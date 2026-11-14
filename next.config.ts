import type { NextConfig } from "next";

// (wp-admin / wp-login.php are forwarded to WordPress in src/proxy.ts, which keeps the ?query part;
//  www.alaraline.co → alaraline.co is a Cloudflare Redirect Rule, see CLOUDFLARE_DEPLOYMENT.md)
const nextConfig: NextConfig = {
  // lets a second local copy run side by side (e.g. the admin panel against the Docker test store on :3001)
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  cacheComponents: true,
  partialPrefetching: true,
  // admin panel photo uploads (the bundles form can send up to 16 photos at once)
  experimental: { serverActions: { bodySizeLimit: '40mb' } },
  // Old WordPress addresses that point at pages this site now serves.
  async redirects() {
    return [
      { source: '/faq', destination: '/faqs', permanent: true },        // footer link; /faq/ was the theme's demo FAQ
      { source: '/shop-2', destination: '/shop', permanent: true },     // breadcrumb "Products" link on live
      { source: '/our-story', destination: '/about', permanent: true },
      // the old WordPress sitemap address (registered in Google Search Console) → this site's sitemap
      { source: '/sitemap_index.xml', destination: '/sitemap.xml', permanent: true },
      { source: '/wishlist-2', destination: '/wishlist', permanent: true },
      { source: '/product-categories', destination: '/shop', permanent: true },
      { source: '/product-category/body-care', destination: '/shop', permanent: true }, // discontinued category
      { source: '/product-tag/:tag', destination: '/shop', permanent: true },
      // the theme's demo pages and old demo blog (never real ÀLara content) → home
      ...['/home-01', '/home-02', '/home-03', '/home-04', '/home-05', '/home-06', '/test', '/tesst', '/test-2', '/sample-page',
        '/special-layout', '/blog', '/feed', '/category/:slug*', '/tag/:slug*', '/author/:slug*', '/:y(\\d{4})/:m(\\d{2})/:d(\\d{2})/:slug']
        .map(source => ({ source, destination: '/', permanent: true })),
      { source: '/contact-02', destination: '/contact', permanent: true },
    ];
  },
  images: {
    // Product photos come from WordPress, served through Jetpack's image CDN (i0/i1/i2.wp.com).
    remotePatterns: [
      new URL("https://alaraline.co/wp-content/uploads/**"),
      { protocol: "https", hostname: "i*.wp.com", pathname: "/alaraline.co/wp-content/uploads/**" },
      // WordPress's own address after the move (see CLOUDFLARE_DEPLOYMENT.md)
      new URL("https://shop.alaraline.co/wp-content/uploads/**"),
      { protocol: "https", hostname: "i*.wp.com", pathname: "/shop.alaraline.co/wp-content/uploads/**" },
      // the local Docker test store (only when the site is pointed at it)
      ...(process.env.WC_URL?.startsWith("http://localhost")
        ? [{ protocol: "http" as const, hostname: "localhost" }, { protocol: "https" as const, hostname: "localhost" }]
        : []),
    ],
    dangerouslyAllowLocalIP: process.env.WC_URL?.startsWith("http://localhost") ? true : undefined,
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
