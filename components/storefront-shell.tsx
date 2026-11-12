"use client";
import { usePathname } from "next/navigation";
import type { Product } from "../lib/types";
import { CartProvider } from "./cart-provider";
import { DisplayCurrencyProvider } from "./display-currency-provider";
import { Header } from "./header";
import { Footer } from "./footer";
export function StorefrontShell({
  products,
  ordersOpen,
  children,
}: {
  products: Product[];
  ordersOpen: boolean;
  children: React.ReactNode;
}) {
  const path = usePathname();
  if (path.startsWith("/admin")) return children;
  return (
    <DisplayCurrencyProvider>
      <CartProvider products={products}>
        <Header ordersOpen={ordersOpen} />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer ordersOpen={ordersOpen} />
      </CartProvider>
    </DisplayCurrencyProvider>
  );
}
