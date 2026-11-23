export function customerAccountsEnabled() {
  return process.env.WONS_CUSTOMER_ACCOUNTS_ENABLED === "true" &&
    (process.env.VERCEL_ENV === "production" ||
      (!process.env.VERCEL_ENV && process.env.NODE_ENV === "development"));
}
