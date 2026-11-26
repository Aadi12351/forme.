# Frontend and backend repairs — 25 November 2026

Fixed:
- Homepage initialisation crashed on the removed footer year element; product loading and reveal setup now complete.
- Header offset ignored the preview banner; normal-flow sticky navigation now sits above the hero.
- Removed duplicate desktop navigation, oversized hero text and mobile hero top gap/hidden line breaks.
- Mobile navigation includes customer account, wishlist and bag links and begins below the actual header.
- Product colours use compact accessible swatches. Mobile buying has an explicit fixed bar, with size selection and drawer scroll locking.
- Narrow checkout/billing fields and navigation wrap without horizontal overflow.
- Graphic feature links to the graphic collection. Hero preloads use the WebP assets.
- Replayed captured-payment events cannot downgrade an already-paid order during delivery/refund states.
- Malformed API body types and cookies fail safely.
- An intentionally empty catalogue stays empty after server restart instead of restoring seed products.

Validation:
- npm test: 23 passed, zero failed, with mocked payment/shipping providers.
- 31 local HTTP routes passed on the updated temporary backend at port 3101.
- Browser: desktop homepage has 11 product cards and no header/hero overlap; mobile menu/product controls checked; 320px checkout and separate billing fields have no horizontal overflow; fresh checkout console had no errors.
- Live payments remained disabled. No charges, emails or shipments were created.

The running port-3000 process must be restarted manually to load backend changes. Automatic approval review rejected restarting that existing Node process with the reason 'blocked by policy'. Frontend files are already saved and use a new cache version.

Additional fix: HTML and development assets revalidate instead of caching stale page shells. Verified on an isolated local process. Use Ctrl+Shift+R on the current browser after the server restart.

26 November follow-up: the old local process was no longer running. Started the repaired server on port 3000 and verified 31 routes, 11 products, fresh-cache behaviour, malformed-request handling and authoritative pricing. No restart blocker remains for the current running version.
