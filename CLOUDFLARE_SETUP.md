# Forme public launch page and continuous deployment

Target: 11 December 2026, 05:00 IST (2026-12-10T23:30:00Z).
Countdown is informational: it never enables payments or redirects automatically.

## What is prepared
- launch/: standalone public holding page, image and countdown.
- npm run build:launch: builds dist-launch/ with an explicit public-file allowlist. No .env, SQLite, uploads or customer data copied.
- .github/workflows/ci.yml: runs the 23 backend tests and builds the holding page on pushes and pull requests.
- Local store remains available at localhost:3000. /coming-soon previews the holding page after the Node server is restarted.

## GitHub and Cloudflare Pages
1. Create a PRIVATE GitHub repository for this project. Commit only application source, launch/, scripts/, tests/, public assets, .env.example and configuration/docs. Never commit .env, backups/, data/*.sqlite*, data/local-secrets*, uploads/ or ZIPs. Review data/products.json and assets for intended publication.
2. This project currently inherits an unrelated E:/ Git repository. Do not push E:/ or mark it safe. Create a repository scoped specifically to E:/forme-catalog before staging files.
3. Cloudflare > Workers & Pages > Create application > Pages > Connect to Git. Connect only the intended repository.
4. Production branch: main. Framework preset: None. Build command: npm test && npm run build:launch. Build output directory: dist-launch. Set NODE_VERSION=22.17.0.
5. First deploy to the provided pages.dev address and check the countdown. In Custom domains add wearforme.in and www.wearforme.in. Let the Pages custom-domain wizard supply the DNS records. Replace the old parking A record only when connecting this project; do not create conflicting records or guess an IP.
6. Push a commit to main: Pages builds and deploys automatically. A failed build leaves the last successful deployment online. GitHub Actions is an additional verification check; require its success for merges into main using repository branch protection.
7. Feature branches get separate Pages preview URLs. Enable Cloudflare Access protection for those previews if private. These previews contain ONLY the holding page, not the functional store.

## Working on the real shop
This Node HTTP + node:sqlite application cannot be deployed unchanged as static Pages files. Keep testing locally for now. To get a functional private online staging shop, deploy the Docker application on a Node-compatible host/VPS with persistent disk, staging-only database and test payment keys, then protect staging.wearforme.in with Cloudflare Access. Set that host's CI/CD to deploy a staging branch after npm test. Production must use a separate database and secrets; never replace live SQLite from Git or rebuilds.

Cloudflare-only full-store hosting requires an explicit backend migration to Workers, D1 and R2 (and revalidation of transaction, stock, session, upload and webhook behavior). It is not achieved by uploading public/.

## Before opening the shop
Keep CHECKOUT_MODE=preview until launch checklist passes. Configure verified business details, support/email, Razorpay, Shiprocket, inventory, taxes, backups, HTTPS and policies. At launch explicitly switch the domain from the Pages holding page to the verified shop host. The countdown alone makes no DNS or checkout changes.

## State
Files prepared locally. GitHub remote, Cloudflare account access, project creation, nameserver activation and custom-domain deployment have not been completed or verified by this task.
