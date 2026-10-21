"use client";
import { usePathname } from "next/navigation";
import type { Product } from "../lib/types";
import { CartProvider } from "./cart-provider";
import { Header } from "./header";
import { Footer } from "./footer";
export function StorefrontShell({
  products,
  children,
}: {
  products: Product[];
  children: React.ReactNode;
}) {
  const path = usePathname();
  if (path.startsWith("/admin")) return children;
  return (
    <CartProvider products={products}>
      <Header />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </CartProvider>
  );
}
