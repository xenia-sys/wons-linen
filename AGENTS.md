# WONS LINEN

Build the English-only Women and Men storefront described in docs/BRD.md.

- Preserve the supplied logo and approved editorial direction in public/design-preview.html.
- The iframe is a design reference, not the completed storefront. Build native components incrementally.
- Do not enable live checkout before server-side inventory, totals, shipping and payment checks pass UAT.
- Read docs/SETUP.md before development or database commands.
- Confirm the exact Vercel and Supabase project before changes. Never use Studio Hub resources.
- Do not commit or print secrets. Only public URL and publishable key may have NEXT_PUBLIC_ prefixes.
- Never give preview deployments production database write access.
- Enable RLS on exposed tables; public users must not read customer or order data.
- Pin dependencies and commit package-lock.json.
- Validate with npm run typecheck and npm run build. Add meaningful commerce tests with commerce implementation.
- Never mark an unverified integration complete.
