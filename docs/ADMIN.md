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

No email address is automatically granted Owner access. The founder must specify the initial Owner email; a trusted project operator then adds that exact normalized email to `staff_members`. Do not infer it from GitHub, a different Supabase project or the first person to register. The founder-specified email has since been approved as Owner. Read-only checks on 2026-10-22 verified that this account exists, has confirmed its email and has signed in. The email is not stored in this public document. An Owner account includes all Marketing Editor capabilities; a different employee needs their own email/account.

Account configuration in the WONS project only (`imgjlzoodxggihhljojf`):

1. Site URL is configured as `https://wons-linen.vercel.app` with the exact allowed redirect `https://wons-linen.vercel.app/admin/login`. Both were saved and verified in the Dashboard. Do not allow wildcard preview redirects.
2. Keep email confirmation enabled. Confirm working email delivery for the intended staff recipients. Supabase's default mail service restricts recipients and is not a verified production delivery channel; configure an approved SMTP provider if required. No paid email service was provisioned.
3. Approve the founder's email as Owner, then use **Activate a staff account** and confirm its email before signing in. Set the password yourself; never share passwords or confirmation codes with an operator or in chat.
4. Owner opens **Team & access**, enters a teammate's individual email and selects **Marketing Editor**. Share the admin URL with that teammate. Saving access does not send an invitation or create an Auth account; they activate and confirm their own account separately.

Production Auth URLs are configured. The founder's confirmed account demonstrates completed activation for that recipient. Full editing acceptance and activation of a separate Marketing Editor account remain pending. The project currently uses default email templates without an approved custom SMTP setup. A registered account without a matching active, verified staff email has no administration access.

## Workspace and sign-in flow

- Open `/admin` for **Overview**, with task cards and a short create → prepare → publish guide.
- **Store operations** contains Products for both roles. **Owner tools** contains Team & access and Activity history for Owners.
- A protected deep link redirects to `/admin/login?next=...`. Only approved local admin destinations can be restored after sign-in. A Marketing Editor requesting an Owner destination goes to Products.
- Direct Owner-only page access displays a clear permission message for Marketing Editors; the API and RLS enforce the same restriction independently.
- Session checks have a timeout and distinguish expired sign-in, denied membership and connection errors with retry actions. Background token verification preserves the current page for the same account rather than unmounting it on each refresh.
- The interface is English and keeps the approved Champagne Gold palette.

## Product workflow

Create a new product as **Hidden**, add at least one variant and save. Then upload front, back, styling and detail photos. Set English image descriptions, optional matching colours and gallery order; the first image is the catalog cover. Save again to attach the gallery. The UI compresses supported images to WebP, up to 2000 pixels on the longest edge and 3 MB after processing. Up to 20 images can be linked to a product.

Set each variant's regular price and optional lower sale price. Clear Sale price to end the discount. The catalog, product detail and bag use the effective price from the current database catalog; stored bag prices are ignored. Publish after confirming the product's images and content. Published non-demo products require variants and photography. New public page loads reflect saved changes; already open pages need a reload. Hidden products are excluded from public catalog queries and product links.

Gallery removal detaches the image; the immutable original Storage object is retained. Product images use a public bucket, so hiding a product does not revoke a previously known image URL. Use this bucket only for approved public product photography.

## Access enforcement and history

Every administration API request verifies the bearer token with Supabase Auth, then checks current staff membership through RLS. Authorization uses the confirmed email in `auth.users` and a live `auth.sessions` record. User-editable metadata cannot assign roles. Disabling membership takes effect on the next protected request; session revocation is checked by the database too. No service-role or secret key is used.

Owner-only team policies prevent Marketing users from assigning roles. The last active Owner cannot be demoted, disabled or changed to another email. Database triggers record product, variant, image-link and team changes with before/after values and the acting user. Owners can filter history by product/visibility, variant/pricing, product image or team access and by created/updated/removed actions. History is ordered newest first and paginated in sets of 25 using a validated ID cursor. Each entry identifies the actor and Vietnam time, gives an operation label, and expands to show changed fields before and after. Refresh, retry and explicit loading/empty/error states are provided. Marketing Editors cannot read or modify history.

A read-only hosted check on 2026-10-22 verified that the existing Owner session resolves to the Owner role, has SELECT access and can read both current activity rows. Both were staff membership changes; no product changes had been recorded at that point. The check did not create Auth users/sessions or alter data. This proves effective database access, not the founder's browser/API path.

Product saves are atomic across product fields, variants and gallery links. A version conflict blocks stale forms from overwriting newer changes. Reload the product before retrying. Preview deployments have administration disabled, and development writes require an explicit local opt-in. Keep that opt-in off when development points to production.

## Verification and remaining acceptance

The deployment build runs Next.js build, an explicit typecheck and the Node tests before it can become ready. Tests cover safe return destinations, Owner/Marketing navigation, activity filter/cursor validation, history labels and before/after formatting in addition to input validation/discounts/cart behavior. Previous validation also completed `npm run test:rls` using an isolated in-memory PostgreSQL engine. The SQL suite applies the actual migrations to minimal Auth/Storage schema contracts and checks guest/customer denial, hidden rows, Marketing publication/prices/image policies, role escalation denial, Owner team/history, last-Owner protection, stale/atomic saves, disabled staff and revoked sessions. Fixtures are rolled back. It never reads `.env` or connects to hosted Supabase.

Hosted database verification is read-only: RLS on every exposed table, bucket limits, existing catalog counts and security advisors. Public HTTP checks confirm all administration endpoints reject unauthenticated requests with 401 and checkout remains closed with 503. The production deployment is READY and its login UI was verified in the browser. Vercel runtime logs could not be inspected because the logs API returned 403; no CLI login is configured. A proposed rollback-based test with synthetic hosted Auth users/sessions was rejected by automatic approval review; the isolated suite replaced it. Do not run `supabase/tests/product_admin.sql` against production.

Owner activation and a live session are now confirmed by read-only database checks. Remaining real-account browser acceptance: open Overview and the deep-linked history page, filter and expand a change, grant one Marketing account, upload an approved photo, set a sale price, publish then hide a designated test product, verify the public gallery and bag after reload, inspect history, revoke access and confirm the next protected request is denied. The isolated database suite does not prove SMTP, real Auth redirects or Storage HTTP upload/download behavior.
