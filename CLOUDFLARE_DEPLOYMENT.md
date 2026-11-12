# Deploying to Cloudflare Workers (vinext)

The site runs on Cloudflare Workers through **vinext 1.4.5** (Cloudflare's recommended way to run Next.js; it is in
beta). The standard Next.js commands still work unchanged.

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server (as before) |
| `npm run build` / `npm start` | Next.js production build / server (as before) |
| `npm run dev:vinext` | Local dev inside Cloudflare's runtime (workerd), port 3001 |
| `npm run build:vinext` | Cloudflare production build (output in `.cloudflare/`, gitignored) |
| `npm run start:vinext` | Run the built Worker locally |
| `npm run deploy:vinext` | Deploy to Cloudflare (`vinext-cloudflare deploy`), needs `npx cf auth login` |

Config: `cloudflare.config.ts` (Worker `alaraline-frontend`, settings), `vite.config.ts`. There is no `wrangler.jsonc`
on purpose: `npx wrangler deploy` cannot deploy this project.

## Persistent catalog cache (Workers KV)

The app uses Next.js Cache Components (`use cache`) for public WooCommerce catalog/content reads. Production vinext
deployments therefore require a persistent data-cache adapter. `vite.config.ts` uses vinext's official
`kvDataAdapter()`, and `cloudflare.config.ts` declares its required `VINEXT_KV_CACHE` Workers KV binding.

[`cf deploy` provisions missing binding resources](https://developers.cloudflare.com/cf/projects/#deploy)
automatically because `bindings.kv()` intentionally omits a namespace ID. No dashboard namespace or ID is normally
required. The Workers Builds API token must retain **Workers KV Storage: Edit** permission; the
[standard token Cloudflare creates for Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#api-token)
includes it. If provisioning is denied, fix that token permission and retry instead of adding credentials to Git.

KV contains only the serialized output of the public cached functions in `src/lib/woo.ts` and `src/lib/alara.ts`:
products, categories, public product tabs/reviews, bundles, Results Wall and packaging display data. Cart, checkout,
accounts, orders, forms and admin calls do not use `use cache`; their backend requests use `cache: 'no-store'` where
applicable, and their cookies/tokens are never stored in KV. Catalog entries use `cacheLife('hours')` (5-minute client
stale time, hourly background revalidation, one-day hard expiry) and the custom admin panel invalidates matching tags
immediately after catalog/content edits. Edits made directly in wp-admin can remain cached until the hourly
revalidation; add the planned authenticated invalidation webhook before requiring immediate wp-admin-to-storefront
updates.

As of 12 November 2026, the official [Workers KV pricing](https://developers.cloudflare.com/kv/platform/pricing/) and
[limits](https://developers.cloudflare.com/kv/platform/limits/) show that the Free plan includes 100,000 key reads/day,
1,000 key writes/day, 1,000 deletes/day, 1,000 list operations/day and 1 GB stored data. Limits reset at 00:00 UTC;
after a type of operation reaches its daily limit, further operations of that type fail rather than silently becoming
paid usage. This storefront's hour-long catalog revalidation is intended to keep writes modest, but suitability still
depends on real traffic and the number of distinct products/filter combinations requested. Monitor Workers KV usage
during preview and after launch; do not enable a paid plan without owner approval.

## Settings (Secrets)

Set these as **Secrets** in Cloudflare: Workers & Pages → alaraline-frontend → Settings → Variables and Secrets.
Locally put them in `.dev.vars` (gitignored; same format as `.env`). The app reads them as `process.env.*`.

| Name | Value |
|---|---|
| `WC_URL` | WordPress address. Preview: `https://alaraline.co`. After the move: `https://shop.alaraline.co` |
| `WC_CONSUMER_KEY` / `WC_CONSUMER_SECRET` | WooCommerce REST key, **Read** |
| `WC_ADMIN_KEY` / `WC_ADMIN_SECRET` | WooCommerce REST key, **Read/Write** (admin panel) |
| `ADMIN_SESSION_SECRET` | random 32+ characters (`openssl rand -base64 36`) |
| `ADMIN_USERS` | output of `node scripts/admin-user.mjs <user> <password> [Name]` (choose a strong password) |
| `ALLOW_LIVE_CHECKOUT` | **leave unset**. Set to `1` only when the owner decides to take real orders on the new site |

Build-time variable (Settings → Build → Variables): `NEXT_PUBLIC_WC_URL` = same as `WC_URL`. Used for photo links
and two outbound links; defaults to `https://alaraline.co`.

Never put keys in Git or chat. Revoke the WooCommerce key and Application Password that were shared during the audit.

## First deploy to a workers.dev preview (Git integration)

1. Cloudflare dashboard → Workers & Pages → Create → Import a repository → GitHub → `razanhasbini/alaraline-production`.
2. Project name: `alaraline-frontend` (must match `cloudflare.config.ts`). Branch: `main`.
3. Build settings: **Build command: leave empty.** **Deploy command: `npm run deploy:vinext`.**
   Root directory: `/`. Build variable `NEXT_PUBLIC_WC_URL=https://alaraline.co`.
4. Deploy. The first successful deploy provisions the `VINEXT_KV_CACHE` namespace automatically. Then add the Secrets
   above (with `WC_URL=https://alaraline.co`, `ALLOW_LIVE_CHECKOUT` unset) and redeploy.
5. In WordPress wp-config.php add the workers.dev address to `ALARA_HL_ORIGINS` (comma-separated).
6. Check on the `*.workers.dev` address: home, shop, a product, bundles, Results Wall, `/admin` sign-in.
   Checkout shows the "Test mode" message; that is intended.

## Caching (what is cached, what is not)

- Catalog pages (home, shop, products, categories) are cached in the Worker's memory for 1 hour, then refreshed in
  the background (`s-maxage=3600`). Measured locally: first request ~0.1–0.3 s, repeats ~5–12 ms.
- Private responses are `no-store`: My Account, order received, `/api/cart`, `/api/account`, all `/admin`.
- Init flags used: `--cdn-cache=none --data-cache=none --image-optimization=none --no-prerender` (free tier, no KV/R2).

## Photos

vinext does not resize remote images. `src/lib/wp-image.ts` asks WordPress's Jetpack image CDN (`i0.wp.com`, free)
for each photo at the size it is shown, and after the move points old `alaraline.co/wp-content/...` links at
`NEXT_PUBLIC_WC_URL`. `src/app/wp-content/[...path]` forwards old file links to `WC_URL` (307) only when WordPress
is on a different address than the site (no loop today).

## Free-tier check (measured on the build)

Server code ~0.72 MB gzipped (limit 3 MB). Largest server chunk: the three.js hero (618 KB raw).
Not verifiable without a live deploy: CPU time per request (free limit 10 ms CPU; time spent waiting on WordPress
does not count), memory under real traffic, cold-start time.

## Verified locally (workerd, against a Docker copy of the store)

All routes render; cart cookies persist; promo-code rules; PR box fee ($238 + $25 + $4 = $267); cash-on-delivery
order created in WooCommerce with Packaging + consent meta; order-received page (wrong key rejected); register /
login / logout / order history; admin sign-in (scrypt + AES-GCM), all admin pages, promo-code creation, photo upload;
redirects (/faq, /our-story) and 404. `npm run build`, `npm run build:vinext`, `npm run lint`, `tsc` pass.
