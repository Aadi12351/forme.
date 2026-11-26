# Forme — Ecommerce store

Premium Minimal Streetwear. Everyday Essentials. Elevated.

This upgrade is saved in E:/forme-catalog. It extends the original product catalogue and admin editor. The original source was backed up under backups/before-ecommerce-20261125-174929.

## Start locally

Requires Node 22.17 or newer (uses built-in node:sqlite).

1. Stop the old npm start process with Ctrl+C in its terminal.
2. In E:/forme-catalog run npm start.
3. Open http://localhost:3000.
4. Product studio: /admin. Store operations: /admin/orders.

No npm install is required. The generated .env contains the private owner ADMIN_PASSWORD and SESSION_SECRET. Open that file locally to obtain your owner password; do not publish or share it. The old shared default password is removed.

## Modes

- preview (default): browse, bag, wishlist, accounts, policies and support work; placing orders is disabled.
- demo: local demonstration orders only. No money or courier booking. Demo orders use stock in their database, so use an isolated STORE_DATA_DIR for demonstrations.
- test: Razorpay test keys, mocked/sandbox review as appropriate; Shiprocket serviceability still needs a real configured API account. Test payments are never shipped by this app.
- live: server requires all readiness checks, live keys, HTTPS origin and configured providers.

The customer and admin interfaces visibly identify non-live modes. No external account has been activated or payment/shipment created during development.

## Storage

data/store.sqlite is now authoritative for products, inventory, customers, sessions, orders, settings and support requests. data/products.json is the original import seed, not the live inventory. Product changes use the existing admin studio, which now writes SQLite. Categories remain in data/categories.json. uploads contains product media.

Use one Node server process per database. SQLite uses transactions and WAL. Do not run old JSON-based and new SQLite-based servers as a real store at the same time. See DEPLOYMENT.md for persistent hosting and backup/restore.

## Implemented

- Editorial homepage with WebP heroes and supplied campaign detail artwork; no sample testimonials.
- Shop all, arrivals, essentials, graphics, searchable/filterable cards, wishlist, product colour choices, available sizes, bag drawer and cart.
- Guest checkout and optional account checkout, separate billing address, notes, coupons, complete server-calculated totals and PIN validation/serviceability.
- Persistent hashed-password accounts, sessions, logout, email password recovery, customer order history, private guest order links, cancellation and return/exchange requests.
- Atomic stock reservations, expiry/release, captured-payment verification, signed/idempotent webhooks, late-payment review, partial/full refunds, verified refund lifecycle webhooks and external booking reconciliation safeguards.
- Owner dashboard: sales metrics, orders/statuses, stock alerts, product specifications/cost/MRP, customer list, support messages, returns, coupons, banners, store/shipping/tax settings, CSV reports and consented event analytics.
- Provider adapters: Razorpay orders/verification/refunds, Shiprocket serviceability/order/AWB/pickup/label/manifest/invoice/tracking and reverse-return workflows, transactional email queue and optional opted-in WhatsApp templates, consented Meta CAPI purchase queue.
- Policy/support/about/size/FAQ pages, product JSON-LD/Open Graph, sitemap, robots, Docker/Caddy files and database backup tools.

## Verify

npm test

The tests use temporary databases and mocked payment/shipping providers. They do not prove real provider account activation, banking, courier pickup, tax/legal compliance or all production security properties. Follow LAUNCH.md before taking money.

## Important limits

The application is prepared for launch configuration, not certified production-ready. Gateway and shipping payloads require sandbox and controlled live end-to-end validation with your actual accounts. No separate staff accounts or granular staff roles are configured: owner/admin and customer access are separated. COD is implemented behind its disabled-by-default admin preference; test courier collection/remittance and cash refund procedures before enabling it. Analytics are consent-limited and do not represent all traffic. WhatsApp requires approved templates and provider credentials. Reverse shipments and replacement orders are prepared in admin; stock restoration requires physical inspection. Their provider payloads still need validation with your actual Shiprocket account.
# forme.
