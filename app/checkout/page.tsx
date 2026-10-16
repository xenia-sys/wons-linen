import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "../../components/icons";
export const metadata: Metadata = { title: "Checkout Information" };
export default function Checkout() {
  return (
    <section className="information-page checkout-closed">
      <p className="eyebrow">THE FIRST EDIT / COMING INTO VIEW</p>
      <h1>
        Something lovely
        <br />
        is <em>taking shape.</em>
      </h1>
      <p>
        You’re exploring the WONS collection preview. Orders are not open yet,
        and no payment has been taken.
      </p>
      <p>
        Your bag stays on this browser while you explore. Confirmed prices,
        sizing, delivery fees and payment methods will be available before
        purchases open.
      </p>
      <div className="info-actions">
        <Link href="/bag" className="button dark">
          Back to your bag <Arrow />
        </Link>
        <Link href="/shop" className="underlined-link">
          Keep exploring
        </Link>
      </div>
    </section>
  );
}
