import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Checkout } from "../../components/checkout";
import { checkoutGatewaySecret } from "../../lib/checkout-config";
import { customerAccountsEnabled } from "../../lib/customer-config";
import "./checkout.css";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  if ((await searchParams).test !== undefined) redirect("/checkout");
  return <Checkout enabled={Boolean(checkoutGatewaySecret())} accountsEnabled={customerAccountsEnabled()} />;
}
