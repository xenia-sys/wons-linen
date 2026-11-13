"use client";
import Link from "next/link";
import { Arrow } from "./icons";
import { storefrontCollections } from "../lib/storefront-navigation";
import { useDisplayCurrency } from "./display-currency-provider";
export function Footer({ ordersOpen }: { ordersOpen: boolean }) {
  const { currency } = useDisplayCurrency();
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <p className="eyebrow">WONS LINEN</p>
          <p className="footer-manifesto">
            Linen, at
            <br />
            <em>your own pace.</em>
          </p>
        </div>
        <div className="footer-column">
          <p className="eyebrow">THE COLLECTION</p>
          {storefrontCollections.map(({ label, href }) => (
            <Link href={href} key={href}>{label} <Arrow /></Link>
          ))}
        </div>
        <div className="footer-column">
          <p className="eyebrow">A LITTLE MORE</p>
          <Link href="/information/our-story">Our story</Link>
          <Link href="/information/client-care">Client care</Link>
          <Link href="/information/privacy">Privacy & your bag</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} WONS LINEN</span>
        <span>
          {ordersOpen ? "Free shipping within Vietnam" : "Collection preview · Illustrative styles & prices"}
        </span>
        <span>{currency === "USD" ? "EN / USD · Estimated prices" : "EN / VND"}</span>
      </div>
    </footer>
  );
}
