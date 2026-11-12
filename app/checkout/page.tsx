import type { Metadata } from "next";
import { Checkout } from "../../components/checkout";
import { checkoutGatewaySecret } from "../../lib/checkout-config";
import "./checkout.css";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return <Checkout enabled={Boolean(checkoutGatewaySecret())} />;
}
