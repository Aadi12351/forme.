# Forme implementation status

Source: E:/forme-catalog. Default mode: preview. No live payment, shipment or production deployment was performed.

| Area | Implemented locally | Launch dependency |
|---|---|---|
| Brand and storefront | Existing editorial design retained, new shop/arrivals/essentials/graphics pages, responsive navigation, campaign detail panel, wishlist and bag drawer | Approve final imagery and copy |
| Products | Original editor, categories, colour/size inventory, media, MRP/SKU/cost/specifications, measured size charts, POD timing | Enter verified garment details and final inventory |
| Checkout | Guest/account checkout, separate billing, notes, INR totals, PIN/serviceability, coupons, tax snapshots, stock reservations | Confirm business/tax/pricing and partner setup |
| Payments | Razorpay orders, captured-payment verification, signed/idempotent payment/refund webhooks, partial/full refunds, late-payment review, refund recovery | Merchant onboarding, keys, HTTPS and live end-to-end validation |
| Accounts | Salted scrypt passwords, durable sessions, recovery, history, private guest links, customer suspension | Verified transactional email and operating/privacy procedures |
| Delivery | Shiprocket order/AWB/pickup/documents/tracking, bounded status polling and uncertain-booking recovery | API user, pickup/parcel measurements, actual provider validation |
| Returns/exchanges | Customer requests, owner decisions, reverse booking/pickup/tracking, physical inspection, guarded restocking and one-time replacements | Verified return destination and real reverse logistics test |
| Notifications | Transactional email queue, approved-template WhatsApp adapter with opt-in, disabled abandoned-checkout template | Email domain/provider, WhatsApp templates/credentials |
| Admin | Metrics, orders, customers, inventory, support, requests, coupons, banners, settings and CSV | Owner operating checks; no separate staff accounts configured |
| Marketing | Consent-based GA4/Meta loading, server purchase records, CAPI queue with event deduplication, variant CSV feed | Account IDs/tokens, supported API versions, approvals and campaign validation |
| SEO/performance | Product JSON-LD/OG, canonical metadata, sitemap/robots, WebP heroes and product variants, lazy loading | Domain/ownership verification and real-device performance review |
| Policies/support | Supplied policies drafted, configurable contacts, FAQ, size guide, contact form | Legal identity, grievance contact and final approval |
| Infrastructure | Docker/Compose/Caddy config, HTTPS-ready reverse proxy, health check, persistent SQLite/uploads, backup/integrity tools | Hosting/DNS/TLS setup, off-device backups and restore drill |

The application keeps live checkout disabled until its readiness requirements are met. Passing local/mock tests is not a production security certification or proof of external provider compatibility.
