import type { Metadata } from "next";
import localFont from "next/font/local";
import { getCatalog } from "../lib/catalog";
import { getDiscountPricing } from "../lib/discount-pricing";
import { StorefrontShell } from "../components/storefront-shell";
import { checkoutGatewaySecret } from "../lib/checkout-config";
import "./globals.css";
const sans = localFont({
  src: [
    { path: "./fonts/noto-sans-400.woff", weight: "400" },
    { path: "./fonts/noto-sans-500.woff", weight: "500" },
    { path: "./fonts/noto-sans-600.woff", weight: "600" },
  ],
  variable: "--font-sans",
  display: "swap",
  fallback: ["Arial"],
});
const serif = localFont({
  src: [
    { path: "./fonts/noto-serif.woff", style: "normal", weight: "400" },
    { path: "./fonts/noto-serif-italic.woff", style: "italic", weight: "400" },
  ],
  variable: "--font-serif",
  display: "swap",
  fallback: ["Georgia"],
});
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "WONS LINEN | Women & Men", template: "%s | WONS LINEN" },
  description:
    "The WONS LINEN collection preview. Easy silhouettes for Women and Men, at your own pace.",
  robots: { index: false, follow: false },
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [products, pricing] = await Promise.all([getCatalog(), getDiscountPricing()]);
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <StorefrontShell products={products} nextPriceChange={pricing.next_change_at} ordersOpen={Boolean(checkoutGatewaySecret()) && products.some(p => p.status === "published" && !p.is_demo)}>{children}</StorefrontShell>
      </body>
    </html>
  );
}
