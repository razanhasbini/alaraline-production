import type { NextConfig } from "next";

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
