import type { Metadata } from "next";
import { CustomerAccount } from "../../components/account/customer-account";
import { customerAccountsEnabled } from "../../lib/customer-config";
import "./account.css";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AccountPage() {
  return <CustomerAccount enabled={customerAccountsEnabled()} />;
}
