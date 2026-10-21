# WONS storefront — first implementation

The approved editorial direction is implemented with native Next.js pages. All customer UI is English; the supplied WONS FASHION logo is preserved. Women and Men share the same bag.

## Available

- Home, /shop, /women, /men, individual /products/[slug] pages, /bag and /checkout information.
- Category filtering, text search, price sorting, empty results and unavailable size states.
- Explicit size selection, color-specific variant selection, same-SKU merging, quantity updates/removal and catalog-based sample subtotal.
- Browser bag persistence and cross-tab updates; malformed/stale data is sanitized.
- Public Supabase catalog with RLS; staff-only product administration. No customer data or orders tables.
- Responsive CSS, keyboard focus, live bag feedback, reduced motion support, local fonts and original SVG concept drawings.
- Product detail gallery with a large image, vertical desktop thumbnails, horizontal mobile thumbnails, previous/next controls, swipe and an accessible enlarged-image modal. Colour changes reset the matching gallery. Photography can be configured in content/product-images.json; see docs/PRODUCT_IMAGES.md. Current assets remain labelled concept illustrations.
- English product administration at /admin/login with Owner and Marketing Editor roles. Marketing manages content, photos, variants, regular/sale prices and publication. Owner additionally manages staff and reads change history. Activation and remaining real-account acceptance are documented in docs/ADMIN.md.

## Deliberately closed before launch

Checkout returns no success state and never accepts payment or creates an order. The POST endpoint fails closed independently of environment configuration. Customer accounts, shipping quotes and payments are not implemented. Staff administration is disabled on preview deployments. The initial catalog still contains demo prices/quantities and concept illustrations.

## Validation

Run npm run typecheck, npm test, npm run test:rls, npm run check:supabase and npm run build. Node tests cover admin input validation, discounts and bag behavior. The isolated PostgreSQL suite applies the actual migrations and verifies role policies, atomic/versioned saves and access revocation without touching hosted Auth data.

Hosted checks verify RLS is enabled on all exposed tables and security advisors report no findings. Administration schema/policies were applied only to imgjlzoodxggihhljojf. No initial Owner is assigned until the founder specifies the email. Auth URL/email settings and real staff acceptance remain pending; see docs/ADMIN.md.

Complete browser acceptance before claiming any interactive flow verified. Before commercial launch, use the BRD acceptance checklist and replace preview data with approved content.
