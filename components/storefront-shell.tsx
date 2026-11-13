"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Product } from "../lib/types";
import { CartProvider } from "./cart-provider";
import { DisplayCurrencyProvider } from "./display-currency-provider";
import { Header } from "./header";
import { Footer } from "./footer";
import { MobileMenuOutlet } from "./mobile-menu-outlet";
export function StorefrontShell({
  products,
  ordersOpen,
  nextPriceChange,
  children,
}: {
  products: Product[];
  ordersOpen: boolean;
  nextPriceChange: string | null;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [menuOutlet, setMenuOutlet] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (path !== "/bag" && path !== "/checkout") return;
    // The layout can survive a client navigation with an older price snapshot.
    router.refresh();
  }, [path, router]);
  useEffect(() => {
    if (path.startsWith("/admin") || !nextPriceChange) return;
    const at = Date.parse(nextPriceChange);
    let timeout: ReturnType<typeof setTimeout>;
    let refreshed = false;
    function check() {
      clearTimeout(timeout);
      if (refreshed) return;
      const remaining = at - Date.now() + 250;
      if (remaining <= 0) {
        if (document.visibilityState === "hidden") return;
        refreshed = true;
        router.refresh();
      } else {
        timeout = setTimeout(check, Math.min(remaining, 2147483647));
      }
    }
    if (Number.isFinite(at)) check();
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("visibilitychange", check);
    };
  }, [path, router, nextPriceChange]);
  if (path.startsWith("/admin")) return children;
  return (
    <DisplayCurrencyProvider>
      <CartProvider products={products}>
        <div className="storefront">
          <Header ordersOpen={ordersOpen} menuOutletRef={setMenuOutlet} />
          <MobileMenuOutlet.Provider value={menuOutlet}>
            <main id="main" tabIndex={-1}>{children}</main>
          </MobileMenuOutlet.Provider>
          <Footer ordersOpen={ordersOpen} />
        </div>
      </CartProvider>
    </DisplayCurrencyProvider>
  );
}
