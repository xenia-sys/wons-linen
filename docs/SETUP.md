# Project setup

Status on 2026-10-16:

- GitHub account verified: xenia-sys. Public repository created: https://github.com/xenia-sys/wons-linen.
- Vercel project created: wons-linen, ID prj_mDxtG8QmSsvxzmEYcANuGDAeK4Kl.
- Vercel account ID: team_TeJvTdxaTdqJwtuVI310fE8k.
- Local Vercel pointer is set. CLI authentication and env pull are not complete.
- Supabase organization confirmed: xenia-sys's Org (okdhtacryxvtoojfocaq). The cost tool quoted USD 0/month, but project creation was rejected because the owner already has 2 active Free projects. Do not pause/delete existing projects or upgrade without owner instruction.
- No Supabase keys, migrations, seed, development server or live deployment.

## Resume in order

1. Push xenia-sys/wons-linen. Connect Git to the existing Vercel project, not a new duplicate.
2. Resolve the Free-project quota with the owner; then create wons-linen in the approved organization and Singapore region only if no extra cost applies.
3. Configure public URL, publishable key and any required server-only secret in appropriate Vercel environments. Keep preview/development writes separate from production data.
4. Authenticate Vercel CLI, inspect and link this exact existing project, pull development config into an ignored local file. Production/preview Secret values may not be returned by env pull.
5. npm run check:env must pass before migrations, seeding or npm run dev.
6. Build native storefront components, reviewed schema and RLS; test and deploy a protected preview.

## Commands

npm ci
npm run check:env
npm run dev
npm run typecheck
npm run build

The current homepage embeds the approved mockup. It does not save orders or take payments. Build success does not verify database integration.
