import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Checkout } from "../../components/checkout";
import { getCatalog } from "../../lib/catalog";
import { checkoutGatewaySecret } from "../../lib/checkout-config";
import { TEST_CHECKOUT_COOKIE, testCheckoutAllowed } from "../../lib/test-checkout";
import "./checkout.css";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  const secret = checkoutGatewaySecret();
  if ((await searchParams).test !== "1") return <Checkout enabled={Boolean(secret)} />;
  const allowed = secret && testCheckoutAllowed((await cookies()).get(TEST_CHECKOUT_COOKIE)?.value, secret);
  if (allowed) {
    const catalog = await getCatalog();
    for (const product of catalog) {
      if (product.status !== "preview" || !product.is_demo) continue;
      const variant = product.variants.find(variant => variant.available_quantity > 0);
      if (variant) return <Checkout enabled testLine={{ variantId: variant.id, quantity: 1, product, variant }} />;
    }
  }
  return (
    <section className="checkout-page">
      <div className="checkout-empty">
        <h1>COD test checkout</h1>
        <p>{allowed ? "There are no in-stock sample products to test with." : "Start a test session from the Owner’s order inbox."}</p>
        <Link href="/admin/orders" className="button dark">Back to Orders</Link>
      </div>
    </section>
  );
}
