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
  metadataBase: new URL("https://www.wonslinen.vn"),
  title: { default: "WONS LINEN | Women & Men", template: "%s | WONS LINEN" },
  description:
    "The WONS LINEN collection. Easy silhouettes for Women and Men, at your own pace.",
  // Link previews on Facebook, Zalo and Messenger. Product pages replace the image with a product photo.
  openGraph: {
    type: "website",
    siteName: "WONS LINEN",
    locale: "en_US",
    // 1200x630 logo on cream: link previews crop to a wide frame and some apps darken transparent images.
    images: [{ url: "/og-wons.png", width: 1200, height: 630, type: "image/png", alt: "WONS Fashion" }],
  },
  twitter: { card: "summary_large_image" },
  // Admin, account, bag and checkout set their own noindex; robots.ts blocks crawling them.
  robots: { index: true, follow: true },
  verification: { google: "ETlbBG-02aHAPGtecObvcMNA1bNFjiCcBkWUtqknLcY" },
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
