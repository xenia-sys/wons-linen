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
- No database migrations, catalog seed, commerce tables, auth roles or live checkout have been implemented.

## Source project pause and backup

The owner explicitly authorized pausing xenia-sys's Project (dixkduoxmgewwcezkcls) after backup. Its status was verified INACTIVE. Studio Hub was not modified.

The private backup was saved outside this repository. It contains 14 business tables (181 rows), schema metadata and SQL references, 6 non-secret account records, and all 4 Storage files. Business/Storage row counts and checksums matched a second source query. Download sizes and ZIP CRC were verified. It is a selective logical export, not pg_dump or a full environment clone: no passwords, sessions, tokens, API secrets or external Auth settings. Restoration into another project has not been tested. Resume of the original project remains the preferred recovery method. Never commit this backup or customer data to this public repository.

## Development

npm ci
npm run check:env
npm run check:supabase
npm run dev
npm run typecheck
npm run build

The public-client helper in lib/supabase.ts is for public reads only. All exposed tables must have RLS. No anon write policies exist yet; review environment isolation before adding any writes. Preview must not obtain production data write privileges.

Next build native storefront components, then design and review schema/RLS, catalog management and checkout. The current homepage embeds the approved interactive mockup. It does not persist orders or take payment. Build/REST endpoint success does not verify a completed commerce flow.
