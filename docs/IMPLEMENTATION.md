# WONS storefront — first implementation

The approved editorial direction is implemented with native Next.js pages. All customer UI is English; the supplied WONS FASHION logo is preserved. Women and Men share the same bag.

The approved Champagne Gold palette is shared by the storefront and product administration: ivory `#FFFCF4`, champagne surfaces `#F4E9CD`, gold accents `#D8C18C`, bronze actions `#8A713D` and charcoal-brown text `#2E2A23`. Secondary text, focus rings and input borders use coordinating warm neutrals. Product colours and semantic success/error states remain independent from the brand palette.

## Available

- Home, /shop, /women, /men, individual /products/[slug] pages, /bag and /checkout information.
- Category filtering, text search, price sorting, empty results and unavailable size states.
- Explicit size selection, color-specific variant selection, same-SKU merging, quantity updates/removal and catalog-based sample subtotal.
- Browser bag persistence and cross-tab updates; malformed/stale data is sanitized.
- Public Supabase catalog with RLS; staff-only product administration. No customer data or orders tables.
- Responsive CSS, keyboard focus, live bag feedback, reduced motion support, local fonts and original SVG concept drawings.
- Product detail gallery with a large image, vertical desktop thumbnails, horizontal mobile thumbnails, previous/next controls, swipe and an accessible enlarged-image modal. Colour changes reset the matching gallery. Photography can be configured in content/product-images.json; see docs/PRODUCT_IMAGES.md. Current assets remain labelled concept illustrations.
- English product administration at /admin/login with Owner and Marketing Editor roles. Marketing manages content, photos, variants, regular/sale prices and publication. Owner additionally manages staff and reads filtered, paginated before/after change history. Overview, grouped navigation and safe sign-in return destinations clarify the role-specific workflow. Activation and remaining real-account acceptance are documented in docs/ADMIN.md.

## Deliberately closed before launch

Checkout returns no success state and never accepts payment or creates an order. The POST endpoint fails closed independently of environment configuration. Customer accounts, shipping quotes and payments are not implemented. Staff administration is disabled on preview deployments. The initial catalog still contains demo prices/quantities and concept illustrations.

## Validation

Run npm run typecheck, npm test, npm run test:rls, npm run check:supabase and npm run build. The deployment build includes the explicit typecheck and Node tests. Node tests cover admin navigation and safe redirects, activity filtering/formatting, admin input validation, discounts and bag behavior. The isolated PostgreSQL suite applies the actual migrations and verifies role policies, atomic/versioned saves and access revocation without touching hosted Auth data.

Hosted checks verify RLS is enabled on all exposed tables. Administration schema/policies were applied only to imgjlzoodxggihhljojf. The founder's specified email is now approved as Owner and its confirmed account and live session were verified read-only. Production Auth URLs are configured. A read-only Owner-context query verified access to the two existing staff activity rows. Full authenticated browser acceptance, separate Marketing activation and product editing/upload acceptance remain pending; see docs/ADMIN.md.

Complete browser acceptance before claiming any interactive flow verified. Before commercial launch, use the BRD acceptance checklist and replace preview data with approved content.
