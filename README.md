# WONS LINEN

English-language Women and Men linen storefront built with Next.js, Vercel and a dedicated Supabase project.

Native editorial homepage, Women/Men catalogs, product pages, search, filters and a persistent preview bag. The sample catalog is read from Supabase with RLS and SELECT-only public access. Orders and payments are not open.

- Requirements: docs/BRD.md
- Setup status: docs/SETUP.md
- Implementation and limitations: docs/IMPLEMENTATION.md
- Agent instructions: AGENTS.md
- Design reference: public/design-preview.html
- Supplied logo: public/wons-logo.png

Run npm ci, complete docs/SETUP.md, then npm run dev. Validate with npm run typecheck, npm test, npm run check:supabase and npm run build. Credentials belong only in ignored local files and provider configuration.
