# WONS product administration

Production entry: https://wons-linen.vercel.app/admin/login. Use **Language** at the upper right to switch the admin interface between **English** and **Tiếng Việt**, including on the sign-in screen. The browser remembers the choice. It does not change storefront copy, product content or account permissions.

| Capability                                                                  | Marketing Editor | Owner |
| --------------------------------------------------------------------------- | ---------------- | ----- |
| Create products; edit descriptions, Women/Men, categories and display order | Yes              | Yes   |
| Upload, reorder and remove product gallery images; edit alt text and colour | Yes              | Yes   |
| Publish or hide products                                                    | Yes              | Yes   |
| Edit base prices in VND and schedule discount events                       | Yes              | Yes   |
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

Create a new product as **Hidden**, add at least one variant and save. Then upload front, back, styling and detail photos. Set English image descriptions and optional matching colours. Choose **Set as cover** to move a photo to the first gallery position, then choose **Save product** at the bottom of the form to attach the gallery. Product photos can be up to 40 MB before optimization and 3 MB afterward. The editor resizes and compresses each file independently, starting at up to 2000 pixels on the longest edge. HEIC is supported when the browser can decode it. Up to 20 images can be linked to a product. If a file fails, the editor names it, keeps completed uploads, and continues with the remaining files.

To feature a published product, choose **Department → New Arrivals** and confirm its **Main department** (Women or Men). It remains in that department and appears first in New Arrivals. Change Department back to Women or Men and save to remove it from New Arrivals. The Department filter in the Products list shows manually featured products when set to New Arrivals.

To replace a homepage cover, sign in as Owner and go to **Storefront images**. Choose an image for **Homepage main cover**, **Women cover** or **Men cover**, add a short image description and select **Publish image**. Each slot can be restored to the original WONS artwork independently. The upload uses a dedicated public Storage bucket in the existing WONS project; restoring the artwork removes the cover from the homepage and leaves the previously published file in Storage. Cover publication and restoration appear in **Activity history**.

Set each variant’s base price in **Price (VND)**. **Price (USD)** shows an estimate from the same reference rate as the storefront; the COD total remains in VND. The **Discount events** page lets Owner and Marketing Editor choose products, set a whole percentage from 1 to 99, and schedule the start and end in Vietnam time. **Save event** activates its schedule; clear **Enable this event** and save to pause it. Each selected product’s variants receive the same percentage off their own base prices. The highest active percentage applies when events overlap. Hidden products remain hidden.

Discounted amounts are rounded to whole VND and checked against the current event schedule at checkout. An old cart price must be reviewed again before placing an order. An existing order keeps its submitted price. The per-variant manual sale price field was removed from the editor; legacy values, if any, are retained outside discount events. Published non-demo products still require variants and photography.

In **Product photography**, choose **Adjust framing** on an image. Drag with a mouse or finger to move it inside a 4:5 frame; use arrow keys or the horizontal/vertical sliders as alternatives. Zoom from 100% to 300% to create more room to move. Dragging stops at the image edges so no blank border appears. **Reset to centre** restores centred 100% zoom, and **Show full image** removes custom framing. Choose **Done adjusting**, then **Save product**. Framing is saved individually per image and is shared by the catalog cover and product gallery (including mobile); the enlarged lightbox shows the original full image. Existing unframed images keep their previous presentation. Source files are unchanged. Owner and Marketing Editor can both edit framing, and changes appear in Activity history as **Image reframed**.

Gallery removal detaches the image; the immutable original Storage object is retained. Product images use a public bucket, so hiding a product does not revoke a previously known image URL. Use this bucket only for approved public product photography.

## Access enforcement and history

Every administration API request verifies the bearer token with Supabase Auth, then checks current staff membership through RLS. Authorization uses the confirmed email in `auth.users` and a live `auth.sessions` record. User-editable metadata cannot assign roles. Disabling membership takes effect on the next protected request; session revocation is checked by the database too. No service-role or secret key is used.

In **Approved team**, Owners can remove another member from the workspace after confirming the selected name and email. This revokes Admin access while keeping the Auth account and audit history. Owners cannot remove themselves or the last active Owner. To restore access, approve the email again.

Owner-only team policies prevent Marketing users from assigning roles. The last active Owner cannot be demoted, disabled or changed to another email. Database triggers record product, variant, image-link and team changes with before/after values and the acting user. Owners can filter history by product/visibility, variant/pricing, product image or team access and by created/updated/removed actions. History is ordered newest first and paginated in sets of 25 using a validated ID cursor. Each entry identifies the actor and Vietnam time, gives an operation label, and expands to show changed fields before and after. Refresh, retry and explicit loading/empty/error states are provided. Marketing Editors cannot read or modify history.

A read-only hosted check on 2026-10-22 verified that the existing Owner session resolves to the Owner role, has SELECT access and can read both current activity rows. Both were staff membership changes; no product changes had been recorded at that point. The check did not create Auth users/sessions or alter data. This proves effective database access, not the founder's browser/API path.

Product saves are atomic across product fields, variants and gallery links. A version conflict blocks stale forms from overwriting newer changes. Reload the product before retrying. Preview deployments have administration disabled, and development writes require an explicit local opt-in. Keep that opt-in off when development points to production.

## Verification and remaining acceptance

The deployment build runs Next.js build, an explicit typecheck and the Node tests before it can become ready. Tests cover safe return destinations, Owner/Marketing navigation, activity filter/cursor validation, history labels and before/after formatting in addition to input validation/discounts/cart behavior. Previous validation also completed `npm run test:rls` using an isolated in-memory PostgreSQL engine. The SQL suite applies the actual migrations to minimal Auth/Storage schema contracts and checks guest/customer denial, hidden rows, Marketing publication/prices/image policies, role escalation denial, Owner team/history, last-Owner protection, stale/atomic saves, disabled staff and revoked sessions. Fixtures are rolled back. It never reads `.env` or connects to hosted Supabase.

Hosted database verification is read-only: RLS on every exposed table, bucket limits, existing catalog counts and security advisors. Public HTTP checks confirm all administration endpoints reject unauthenticated requests with 401 and checkout remains closed with 503. The production deployment is READY and its login UI was verified in the browser. Vercel runtime logs could not be inspected because the logs API returned 403; no CLI login is configured. A proposed rollback-based test with synthetic hosted Auth users/sessions was rejected by automatic approval review; the isolated suite replaced it. Do not run `supabase/tests/product_admin.sql` against production.

Owner activation and a live session are now confirmed by read-only database checks. Remaining real-account browser acceptance: open Overview and the deep-linked history page, filter and expand a change, grant one Marketing account, upload an approved photo, set a sale price, publish then hide a designated test product, verify the public gallery and bag after reload, inspect history, revoke access and confirm the next protected request is denied. The isolated database suite does not prove SMTP, real Auth redirects or Storage HTTP upload/download behavior.

## Owner overview

The Overview shows live aggregates for the last 7, 30 or 90 Vietnam calendar days, including today. The 7-day view uses daily points, and the 30/90-day views group successive seven-day intervals starting at the first day of the selected range. Revenue (VND) and units use the time the Owner marks a delivered COD order as completed after confirming payment; the order-status chart uses order creation time and current status. Orders without a recorded completion timestamp do not contribute to dated revenue. All test orders are excluded. Inventory is a current snapshot for published, non-demo products: out of stock is zero units, low is one to three, and in stock is four or more. Marketing Editors keep their product workspace and cannot access the report. The Owner report is read-only and returns aggregates without customer details.

In **Products**, Owners can use **Delete** to move a product to **Trash**. It is no longer listed on the storefront or in the main Products table. The action keeps its variants, photography, order history, URL and SKUs. **Restore** returns it to the Products table as a hidden draft. Both actions appear in Activity history; they do not delete past orders or change inventory. In **New product**, **Visibility** is below **Variants & pricing** and **Product details** uses the full editor width.
