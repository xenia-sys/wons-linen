# WONS storefront — first implementation

The approved editorial direction is implemented with native Next.js pages. All customer UI is English; the supplied WONS FASHION logo is preserved. Women and Men share the same bag.

## Available

- Home, /shop, /women, /men, individual /products/[slug] pages, /bag and /checkout information.
- Category filtering, text search, price sorting, empty results and unavailable size states.
- Explicit size selection, color-specific variant selection, same-SKU merging, quantity updates/removal and catalog-based sample subtotal.
- Browser bag persistence and cross-tab updates; malformed/stale data is sanitized.
- Read-only Supabase catalog with RLS. No customer data or orders tables.
- Responsive CSS, keyboard focus, live bag feedback, reduced motion support, local fonts and original SVG concept drawings.

## Deliberately closed before launch

Checkout returns no success state and never accepts payment or creates an order. The POST endpoint fails closed independently of environment configuration. The preview has no admin, customer account, shipping quote or payment integration. Prices and quantities are demo data and illustrations are not product photography.

## Validation

Run npm run typecheck, npm test, npm run check:supabase and npm run build. Commerce tests cover mixed departments, SKU merging/separation, safe integer quantities, availability caps, malformed persisted data, repricing, filtering/sorting and the checkout guard.

Hosted data checks verify hidden rows are excluded for anon, public roles have SELECT only, and security advisors report no findings. The migration was applied only to imgjlzoodxggihhljojf.

Complete browser acceptance before claiming any interactive flow verified. Before commercial launch, use the BRD acceptance checklist and replace preview data with approved content.
