# Deploying wearforme.in

No hosting was purchased or deployment performed.

## Economical starting architecture

One supported Linux host, one Node process, SQLite on a persistent local disk, persistent uploads, and Caddy as HTTPS reverse proxy. Do not put SQLite on ephemeral or network storage. Scale to a transactional managed database and object storage before introducing multiple application writers.

## Docker option

1. Copy the complete project and data/uploads directories to a controlled Linux host.
2. Install supported Docker/Compose from their official distribution.
3. Configure .env from .env.example. Set production secrets, APP_URL=https://wearforme.in and keep CHECKOUT_MODE=preview.
4. Make data/uploads/backups writable by the container's node user. Restrict access to .env and database files. Never expose them through a public web root.
5. Point domain DNS A/AAAA records to the host and open inbound 80/443 only. Correct or remove an AAAA record if IPv6 is not working.
6. Run docker compose up --build -d.
7. Caddy obtains TLS only after domain DNS and network reachability are correct.
8. Run health, account, webhook, provider and backup/restore tests; complete LAUNCH.md before live mode.

The store container is not exposed directly to the internet. TRUST_PROXY=true is appropriate only behind that private proxy, which supplies forwarded client IPs. Do not enable it on an internet-exposed Node listener. For local Windows work keep HOST=127.0.0.1 and TRUST_PROXY=false.

## Backups

npm run backup creates a consistent SQLite VACUUM INTO snapshot plus categories and uploads under backups/store-<timestamp>. It does not include secrets.

npm run check-backup -- E:/forme-catalog/backups/<snapshot>/store.sqlite validates database integrity.

To restore: stop the application; preserve the current data/uploads as a separate rollback copy; restore store.sqlite, categories.json and uploads from one matching backup; avoid retaining a stale WAL/SHM from another database; restart and verify staging before reopening checkout. Use native file operations in one shell and verify target paths. No destructive restore command is supplied.

Protect and encrypt off-device copies. Set a retention schedule and run a staging restore drill. Monitoring should cover /health, disk usage, failed webhooks, paid_review orders, refund_pending orders, uncertain shipping bookings and notification backlog.

## Environment and production checks

See .env.example and the readiness display in /admin/orders. Strong admin/session secrets and HTTPS APP_URL are required for production startup. Secure cookies and HSTS are enabled in production. The CSP permits the existing catalogue's trusted inline handlers and selected payment/analytics providers; migrate inline handlers to external scripts before tightening script-src further.

The generated local owner secret is in .env. Rotate it before public deployment. Do not reuse the historical catalogue password.
