"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
  addToCart,
  CART_KEY,
  normalizeCart,
  resolveCart,
  setQuantity,
} from "../lib/commerce";
import type { CartLine, Product, ResolvedLine } from "../lib/types";
type BagContext = {
  lines: ResolvedLine[];
  ready: boolean;
  storageAvailable: boolean;
  add: (id: string, quantity: number) => number;
  update: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  consume: (lines: CartLine[]) => void;
  count: number;
};
const CartContext = createContext<BagContext | null>(null);
export function CartProvider({
  products,
  children,
}: {
  products: Product[];
  children: React.ReactNode;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    try {
      setCart(
        normalizeCart(
          JSON.parse(localStorage.getItem(CART_KEY) ?? "[]"),
          products,
        ),
      );
    } catch {
      setStorageAvailable(false);
    }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== CART_KEY && event.key !== null) return;
      try {
        setCart(normalizeCart(JSON.parse(event.newValue ?? "[]"), products));
      } catch {
        /* Keep current bag when another tab writes malformed data. */
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [products]);
  function commit(next: CartLine[]) {
    setCart(next);
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(next));
    } catch {
      setStorageAvailable(false);
    }
  }
  const lines = resolveCart(cart, products);
  return (
    <CartContext.Provider
      value={{
        lines,
        ready,
        storageAvailable,
        count: lines.reduce((sum, line) => sum + line.quantity, 0),
        add: (id, quantity) => {
          const next = addToCart(cart, products, id, quantity);
          const before = lines.find(line => line.variantId === id)?.quantity ?? 0;
          const added = Math.max(0, (next.find(line => line.variantId === id)?.quantity ?? 0) - before);
          if (added > 0) commit(next);
          return added;
        },
        update: (id, quantity) =>
          commit(setQuantity(cart, products, id, quantity)),
        remove: (id) => commit(cart.filter((line) => line.variantId !== id)),
        consume: (purchased) => {
          const quantities = new Map(purchased.map(line => [line.variantId, line.quantity]));
          commit(cart.flatMap(line => {
            const quantity = line.quantity - (quantities.get(line.variantId) ?? 0);
            return quantity > 0 ? [{ ...line, quantity }] : [];
          }));
        },
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
export function useBag() {
  const bag = useContext(CartContext);
  if (!bag) throw new Error("Shopping bag is unavailable.");
  return bag;
}
