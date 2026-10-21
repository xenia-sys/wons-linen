# WONS product administration

Production entry: https://wons-linen.vercel.app/admin/login. All staff UI is English.

| Capability                                                                  | Marketing Editor | Owner |
| --------------------------------------------------------------------------- | ---------------- | ----- |
| Create products; edit descriptions, Women/Men, categories and display order | Yes              | Yes   |
| Upload, reorder and remove product gallery images; edit alt text and colour | Yes              | Yes   |
| Publish or hide products                                                    | Yes              | Yes   |
| Change regular and sale prices in VND                                       | Yes              | Yes   |
| Manage variant sizes, colours, SKUs and availability                        | Yes              | Yes   |
| Grant, change or disable team access                                        | No               | Yes   |
| Read change history                                                         | No               | Yes   |

Product deletion is not offered. Hide a product to withdraw it from the website. Checkout and payment remain closed.

## Initial activation

No email address is automatically granted Owner access. The founder must specify the initial Owner email; a trusted project operator then adds that exact normalized email to `staff_members`. Do not infer it from GitHub, a different Supabase project or the first person to register. At implementation time, the hosted project has zero Auth users and zero staff memberships.

Before activating real accounts, finish these Supabase Authentication settings in the WONS project only (`imgjlzoodxggihhljojf`):

1. Set Site URL to `https://wons-linen.vercel.app` and allow the exact redirect `https://wons-linen.vercel.app/admin/login`. Do not allow wildcard preview redirects.
2. Keep email confirmation enabled. Confirm working email delivery for the intended staff recipients. Supabase's default mail service restricts recipients and is not a verified production delivery channel; configure an approved SMTP provider if required. No paid email service was provisioned.
3. Approve the founder's email as Owner, then use **Activate a staff account** and confirm its email before signing in. Set the password yourself; never share passwords or confirmation codes with an operator or in chat.
4. Owner opens **Team & access**, enters a teammate's individual email and selects **Marketing Editor**. Share the admin URL with that teammate. Saving access does not send an invitation or create an Auth account; they activate and confirm their own account separately.

The Supabase Dashboard browser currently requires reauthentication, so URL/email settings and real staff activation are pending. Neither email delivery nor an authenticated production editing session has been accepted yet. A registered account without a matching active, verified staff email has no administration access.

## Product workflow

Create a new product as **Hidden**, add at least one variant and save. Then upload front, back, styling and detail photos. Set English image descriptions, optional matching colours and gallery order; the first image is the catalog cover. Save again to attach the gallery. The UI compresses supported images to WebP, up to 2000 pixels on the longest edge and 3 MB after processing. Up to 20 images can be linked to a product.

Set each variant's regular price and optional lower sale price. Clear Sale price to end the discount. The catalog, product detail and bag use the effective price from the current database catalog; stored bag prices are ignored. Publish after confirming the product's images and content. Published non-demo products require variants and photography. New public page loads reflect saved changes; already open pages need a reload. Hidden products are excluded from public catalog queries and product links.

Gallery removal detaches the image; the immutable original Storage object is retained. Product images use a public bucket, so hiding a product does not revoke a previously known image URL. Use this bucket only for approved public product photography.

## Access enforcement and history

Every administration API request verifies the bearer token with Supabase Auth, then checks current staff membership through RLS. Authorization uses the confirmed email in `auth.users` and a live `auth.sessions` record. User-editable metadata cannot assign roles. Disabling membership takes effect on the next protected request; session revocation is checked by the database too. No service-role or secret key is used.

Owner-only team policies prevent Marketing users from assigning roles. The last active Owner cannot be demoted, disabled or changed to another email. Database triggers record product, variant, image-link and team changes with before/after values and the acting user. Owners can view the latest 100 entries; ordinary staff cannot read or modify that history.

Product saves are atomic across product fields, variants and gallery links. A version conflict blocks stale forms from overwriting newer changes. Reload the product before retrying. Preview deployments have administration disabled, and development writes require an explicit local opt-in. Keep that opt-in off when development points to production.

## Verification and remaining acceptance

Completed: typecheck, production build, 21 Node tests for input validation/discounts/cart behavior, and `npm run test:rls` using an isolated in-memory PostgreSQL engine. The SQL suite applies the actual migrations to minimal Auth/Storage schema contracts and checks guest/customer denial, hidden rows, Marketing publication/prices/image policies, role escalation denial, Owner team/history, last-Owner protection, stale/atomic saves, disabled staff and revoked sessions. Fixtures are rolled back. It never reads `.env` or connects to hosted Supabase.

Hosted verification is read-only: RLS on every exposed table, bucket limits, existing catalog counts and security advisors. A proposed rollback-based test with synthetic hosted Auth users/sessions was rejected by automatic approval review; the isolated suite replaced it. Do not run `supabase/tests/product_admin.sql` against production.

Pending real-account acceptance after activation: Owner sign-in, grant one Marketing account, upload an approved photo, set a sale price, publish then hide a designated test product, verify the public gallery and bag after reload, inspect history, revoke access and confirm the next protected request is denied. The isolated database suite does not prove SMTP, real Auth redirects or Storage HTTP upload/download behavior.
