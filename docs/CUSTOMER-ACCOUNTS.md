# Customer accounts

The Account link in the storefront header opens `/account`. Registration asks for a username and email only. The username is for display; the verified email identifies the account. Sign-in links use Supabase Auth with PKCE, so they must open in the same browser. A customer may set a password later and choose password sign-in. Existing staff accounts remain in the staff portal.

The dashboard displays up to five recent orders, separate shipping and billing address forms, account details, password settings, and sign-out. Customers can only see their own order summaries and cannot create or change them. Address access requires the customer's confirmed email and live session; staff roles do not grant access to other customers' data. All customer session data uses the separate `wons.customer.auth` storage key. The database does not accept public customer data.

## Turn on public account access

1. In the WONS LINEN Supabase project (`imgjlzoodxggihhljojf`), configure the store's approved [custom SMTP sender](https://supabase.com/docs/guides/auth/auth-smtp). Supabase's built-in sender only delivers to project team addresses. No SMTP service or credentials are included in this repository.
2. Keep email confirmation and secure email changes enabled. Keep the production Site URL and existing admin redirect, and add the exact customer redirect `https://wons-linen.vercel.app/account`. Keep the Magic Link template's standard confirmation URL for this browser PKCE flow. Do not enable tracking that rewrites auth links.
3. Publish the account privacy and retention details and contact described on the storefront privacy page. Confirm that the customer accounts migration has been applied to the WONS database.
4. Set `WONS_CUSTOMER_ACCOUNTS_ENABLED=true` in Vercel **Production** only and redeploy. Until enabled, the account page shows both forms without collecting submissions. Preview deployments do not sign in or write customer data. Enable in local development only against an isolated test database.
5. Verify registration and sign-in with a controlled non-team mailbox, link return to `/account`, separate address saves, sign-out, email change, and optional password sign-in. Verify a second customer cannot access the first customer's data. The isolated `npm run test:rls` suite tests database authorization without creating hosted accounts or sending email.

Checkout remains closed. The future order workflow must support guest checkout and associate orders with a verified account only when the customer chooses to order while signed in. Do not attach orders by matching email addresses alone. The customer order history stays empty until the trusted order workflow records real orders.
