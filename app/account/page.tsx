import type { Metadata } from "next";
import { CustomerAccount } from "../../components/account/customer-account";
import "./account.css";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AccountPage() {
  const enabled = process.env.WONS_CUSTOMER_ACCOUNTS_ENABLED === "true" &&
    (process.env.VERCEL_ENV === "production" ||
      (!process.env.VERCEL_ENV && process.env.NODE_ENV === "development"));
  return <CustomerAccount enabled={enabled} />;
}
