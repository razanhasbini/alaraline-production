# ÀLara Line storefront (Next.js)

The new website for alaraline.co. WooCommerce stays the backend: products, prices, stock, cart rules, coupons,
packaging fee, delivery and orders all live there. This app never calculates or trusts prices itself.

## Run it

```bash
cd web
cp .env.example .env.local   # then fill it in (see below)
npm install
npm run dev                  # http://localhost:3000
```

Production check: `npm run build && npm start`.

Against the local test shop (wp-dev, http://localhost:8088) instead of the live one:
`WC_URL=http://localhost:8088 NEXT_PUBLIC_WC_URL=http://localhost:8088 ALARA_SNAPSHOTS=0 npm run dev`
(plus the test shop's keys in WC_ADMIN_KEY / WC_ADMIN_SECRET).

## Settings (.env.local, never committed)

| Name | What it is |
|---|---|
| `WC_URL` | The shop backend. While it is alaraline.co, placing orders is switched off. |
| `ALLOW_LIVE_CHECKOUT` | Set to `1` only at cutover, to allow real orders on the live shop. |
| `WC_CONSUMER_KEY` / `WC_CONSUMER_SECRET` | Read-only WooCommerce key (product tabs, "New" badge dates). |
| `WC_ADMIN_KEY` / `WC_ADMIN_SECRET` | Read/Write WooCommerce key used by the admin panel. |
| `ADMIN_USERS` | Admin panel sign-ins: `user:scrypt.<salt>.<hash>:Name`, comma-separated. Make one with `node scripts/admin-user.mjs <user> <password> [Name]`. |
| `ADMIN_SESSION_SECRET` | 32+ random characters; encrypts the admin sign-in cookie. |
| `ALARA_SNAPSHOTS` | `1` = use saved bundle/results data when the shop plugin isn't installed yet. |

The shop needs the **ÀLara Headless API 1.2.0** plugin (`../wp-plugins/alara-headless-api-1.2.0.zip`), and in wp-config:
`ALARA_HL_STOREFRONT` (this site's address, used in password-reset emails) and `ALARA_HL_ORIGINS`.

## How it's organised

| Path | What it is |
|---|---|
| `src/lib/woo.ts` | Catalog reads (Store API), cached for 1 hour. |
| `src/lib/cart.ts` | Cart, checkout and customer calls, relayed from this server to WooCommerce. |
| `src/lib/alara.ts` | Bundles, Results Wall, packaging (ÀLara Headless API). |
| `src/app/api/cart`, `src/app/api/account` | The browser talks only to these; cart id, nonce and sign-in are HttpOnly cookies. |
| `src/app/(shop)/` | Every public page, same URLs as the live site, incl. cart, checkout, my-account, wishlist, compare, search. |
| `src/app/admin/` | Admin panel (own sign-in). |
| `src/components/cart/`, `src/components/account/` | Bag drawer, cart, checkout, wishlist/compare, My account. |
| `src/app/globals.css`, `src/app/(shop)/shop.css` | Styles; colour tokens at the top of globals.css. |

## Not built yet (see ../MIGRATION_PLAN.md)

WhatsApp alerts for new orders (needs a sending service); refreshing the site automatically after edits made in wp-admin
(needs the site deployed).

## Cloudflare Workers

The site can also run on Cloudflare Workers via vinext: `npm run dev:vinext`, `npm run build:vinext`,
`npm run deploy:vinext`. Setup, settings and the first preview deploy are in **CLOUDFLARE_DEPLOYMENT.md**.
