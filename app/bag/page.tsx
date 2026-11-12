import type { Metadata } from "next";
import { Bag } from "../../components/bag";
import { checkoutGatewaySecret } from "../../lib/checkout-config";
export const metadata: Metadata = { title: "Your Shopping Bag" };
export default function BagPage() {
  return <Bag enabled={Boolean(checkoutGatewaySecret())} />;
}
