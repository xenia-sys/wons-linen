# Project setup

Verified on 2026-10-16:

- Public GitHub repository: https://github.com/xenia-sys/wons-linen, production branch main.
- Vercel project: wons-linen, ID prj_mDxtG8QmSsvxzmEYcANuGDAeK4Kl, account team_TeJvTdxaTdqJwtuVI310fE8k.
- Git integration is connected. Pushes use Vercel's Git deployment pipeline.
- Supabase organization: xenia-sys's Org (okdhtacryxvtoojfocaq).
- Dedicated Supabase project: wons-linen, ref imgjlzoodxggihhljojf, Singapore ap-southeast-1, Free creation cost quoted USD 0/month.
- Supabase URL and modern publishable key are configured in Vercel production, preview and development; CHECKOUT_ENABLED=false in all three.
- Local .env.local is ignored by Git and contains only the public configuration and checkout flag. Local Vercel pointer matches the project above. CLI authentication/env pull have not been set up; connector configuration was used.
- Server-only secret/service-role key has NOT been provisioned. Add one only when a reviewed server-side feature actually needs it; never expose it in public code or preview builds.
- Verified: SQL connection to the new WONS database and HTTP 200 from its public Auth settings endpoint using the publishable key. The REST OpenAPI root requires a secret key and is intentionally not used for public-key verification.
- The native storefront now reads products and variants from the public catalog using the publishable key. The preview migration creates 6 demo products and 42 variants; this is illustrative catalog data, not real inventory.
- Both catalog tables have RLS and explicit SELECT grants for anon/authenticated. Hidden products and variants are excluded for guests and non-staff. The product administration migration grants authenticated writes behind active staff policies. No privileged key has been added; administration is disabled in preview deployments.

## Source project pause and backup

The owner explicitly authorized pausing xenia-sys's Project (dixkduoxmgewwcezkcls) after backup. Its status was verified INACTIVE. Studio Hub was not modified.

The private backup was saved outside this repository. It contains 14 business tables (181 rows), schema metadata and SQL references, 6 non-secret account records, and all 4 Storage files. Business/Storage row counts and checksums matched a second source query. Download sizes and ZIP CRC were verified. It is a selective logical export, not pg_dump or a full environment clone: no passwords, sessions, tokens, API secrets or external Auth settings. Restoration into another project has not been tested. Resume of the original project remains the preferred recovery method. Never commit this backup or customer data to this public repository.

## Development

npm ci
npm run check:env
npm run check:supabase
npm run dev
npm run typecheck
npm test
npm run build

The public-client helper in lib/supabase.ts is for public reads only. Administration uses each verified staff session with RLS, not a service key. See docs/ADMIN.md for permissions, account activation and environment isolation. All exposed tables must have RLS. Preview must not obtain production data write privileges.

The homepage, Women/Men catalog, product pages, search, category filters, price sorting and bag are native Next.js components. Noto Sans and Noto Serif are self-hosted with their OFL licenses. The original mockup remains at /design-preview.html for design reference only.

The bag stores only variant IDs and quantities under wons.bag.v1 in browser localStorage. It revalidates against the current catalog, uses valid sale prices and never trusts a stored price. Preview quantity limits are illustrative; items are not reserved. Checkout is visibly closed and POST /api/checkout always returns 503 CHECKOUT_NOT_OPEN, even if CHECKOUT_ENABLED is changed. No customer order, address or payment is collected. Staff accounts are separate from the public shopping experience.

Before opening purchases: activate and accept staff administration, obtain approved photography, catalog prices, fabric/fit/size data, launch status for Men, shipping/tax/payment/returns decisions and client-care contacts. Implement authoritative checkout with inventory concurrency and idempotency, payment verification and order lifecycle; pass BRD U01–U08. Build/catalog success is not evidence of a completed commerce flow.

Migration history is tracked in supabase/migrations. The file version matches the migration applied to the hosted WONS project. Apply only to the dedicated project; never to Studio Hub or the paused source project.
