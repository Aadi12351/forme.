# Forme launch checklist

Live checkout is deliberately disabled. This is a developed store with unvalidated external account integrations, not a guarantee of production readiness.

## Business owner decisions

Complete in /admin/orders:
- Legal business name, registered address, support email, WhatsApp and grievance contact.
- Tax/GST settings approved for the actual business. Prices are not automatically assumed to include a specific GST rate.
- Final product prices and variant counts. Enter actual garment measurements, MRP, SKU and verified composition/GSM in Products.
- Approve shipping/returns/cancellation/payment/privacy/terms wording. The supplied customer policies are drafted into the pages; identity and approval remain pending.
- Pickup PIN, Shiprocket pickup-location name, actual packed parcel dimensions/weights and shipping partner verification.
- Bank/payment onboarding and the business verification flags.

The proposed customer-return reverse charge is Rs 99. Standard shipping defaults to Rs 79 and is free strictly ABOVE Rs 999. All are configurable. In-stock processing is 1–3 business days; estimated delivery is 4–8 business days after dispatch.

## Accounts and secrets

Configure server-side environment variables from .env.example. Never paste secrets into frontend code, Git, screenshots or dashboard text fields.

Razorpay: complete KYC/bank verification, configure capture and webhook delivery to https://wearforme.in/api/store/payment-webhook, then verify test capture/failure/refund, delayed captures and duplicate webhook delivery. Subscribe to payment.captured, refund.created, refund.processed and refund.failed. The callback signature and fetched captured amount/currency/order are checked independently.

Shiprocket: create an API user, configure pickup details and verify serviceability, create-order payload, AWB assignment and tracking using the actual account. Test keys for Razorpay do not create demo Shiprocket shipments: this app blocks shipment creation unless the order mode is live. Courier assignment is distinct from physical dispatch; confirm physical dispatch in admin. Pickup requests, labels, manifests, invoices, reverse pickups and courier-status refresh are implemented behind owner authentication. Validate each with the actual account; uncertain bookings are locked for reconciliation.

Resend: verify the sending domain and EMAIL_FROM. Test password recovery and order notifications. The queue retries each minute. WhatsApp needs an opted-in customer, Cloud API credentials and approved templates with two text body variables (order number and update type). Set supported Graph API versions explicitly. No marketing or abandoned-checkout messages are automatically sent.

Meta/GA4: set public IDs in admin only after the privacy wording is approved. Meta CAPI additionally requires its server token, matching pixel ID and a supported Graph version in the environment. Purchase deduplication uses the Forme order number. Customer account/reset pages do not load optional tracking. Private guest/reset URL tokens are removed before any tracking. Validate in provider test-event tools before campaign use.

Search Console: verify ownership of wearforme.in through DNS, then submit /sitemap.xml when live.
Instagram Shopping: configure the business/catalogue and verify commerce eligibility in Meta. A variant CSV feed is available at /catalog.csv after deployment. Import it into the approved commerce account; account approval and catalogue validation are separate from creating the store.

## Before CHECKOUT_MODE=live

Set NODE_ENV=production, HTTPS APP_URL, long ADMIN_PASSWORD and SESSION_SECRET. Confirm every readiness flag in admin. Real checkout requires a live Razorpay key, webhook secret, configured email, Shiprocket and completed business/tax/policy/inventory/price/bank confirmations. Keep COD off until the prepaid journey is tested; COD also requires courier remittance and cash-refund operating procedures.

Perform one controlled real purchase, real dispatch and refund after sandbox checks. Confirm stock restoration, no duplicate shipments, courier invoice/label, tracking, reverse-shipping operations, bank settlement and notification delivery. Review the store on actual phones and desktop and complete an independent security/accessibility review before advertising.

## Backup and operations

npm run backup
npm run check-backup -- /absolute/path/to/backup/store.sqlite

Back up uploads and categories with the database. Keep .env separately in an encrypted store and maintain an off-device backup with access control. Schedule operating-system backups only when the owner chooses the frequency; no automation was created here. Restore to a separate staging copy and run integrity checks before a live switch.

## Remaining external validation and scope limits

- No provider account, domain, HTTPS deployment, live payment or courier booking has been activated by this work.
- Fulfilment adapters cover pickup/documents/reverse shipments. Real provider-account validation and physical receiving/inspection remain necessary; automated tracking never restocks a returned product without inspection.
- Customer/admin roles are separate; no separate staff accounts or fine-grained staff permissions are created.
- COD order routing is implemented behind the disabled preference; courier remittance reconciliation and cash refunds require operating procedures and test validation.
- Partial/full refunds are capped at the unrefunded captured balance. Uncertain outcomes are blocked from blind retry. Use the verified refund-ID recovery form for an ambiguous result; signed refund webhooks update processed/failed status.
- Outbox and external notification retries are at-least-once. Inspect provider delivery records when a response is uncertain.
- The SQLite architecture suits a small single-server business, not a multi-region/multi-writer deployment.
\n## Return operations\nSet the actual return recipient, phone, street, city, state and PIN in Shipping settings. Approve the request, select the items/quantities, create the reverse order, assign its courier and request pickup. Confirm physical receipt and inspect before restocking. Size replacements retain the original product/quantity, reserve the chosen available size and create exactly one zero-total replacement order. The current in-app replacement path explicitly waives the proposed reverse fee; do not imply a fee has been collected. If a fee is retained from a return refund, review and enter the correct bounded partial refund amount under the approved policy.\n