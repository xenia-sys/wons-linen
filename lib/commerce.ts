import type { CartLine, Product, ResolvedLine } from "./types.ts";
export const CART_KEY = "wons.bag.v1";
export const MAX_PER_VARIANT = 10;
export function money(amount: number) {
  return `VND ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;
}
export function findVariant(products: Product[], variantId: string) {
  for (const product of products) {
    const variant = product.variants.find((item) => item.id === variantId);
    if (variant) return { product, variant };
  }
  return undefined;
}
// Stored carts contain IDs and quantities only. Prices always come from the catalog.
export function normalizeCart(value: unknown, products: Product[]): CartLine[] {
  if (!Array.isArray(value)) return [];
  const merged = new Map<string, number>();
  for (const line of value.slice(0, 200)) {
    if (
      !line ||
      typeof line !== "object" ||
      typeof line.variantId !== "string" ||
      !Number.isSafeInteger(line.quantity) ||
      line.quantity <= 0
    )
      continue;
    const found = findVariant(products, line.variantId);
    if (!found || found.variant.available_quantity <= 0) continue;
    const limit = Math.min(MAX_PER_VARIANT, found.variant.available_quantity);
    merged.set(
      line.variantId,
      Math.min(limit, (merged.get(line.variantId) ?? 0) + line.quantity),
    );
  }
  return [...merged].map(([variantId, quantity]) => ({ variantId, quantity }));
}
export function addToCart(
  lines: CartLine[],
  products: Product[],
  variantId: string,
  quantity = 1,
): CartLine[] {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) return lines;
  return normalizeCart([...lines, { variantId, quantity }], products);
}
export function setQuantity(
  lines: CartLine[],
  products: Product[],
  variantId: string,
  quantity: number,
): CartLine[] {
  if (!Number.isSafeInteger(quantity) || quantity < 0) return lines;
  return normalizeCart(
    lines.map((line) =>
      line.variantId === variantId ? { ...line, quantity } : line,
    ),
    products,
  );
}
export function resolveCart(
  lines: CartLine[],
  products: Product[],
): ResolvedLine[] {
  return normalizeCart(lines, products).flatMap((line) => {
    const found = findVariant(products, line.variantId);
    return found ? [{ ...line, ...found }] : [];
  });
}
export function subtotal(lines: ResolvedLine[]) {
  return lines.reduce(
    (total, line) => total + line.variant.price_vnd * line.quantity,
    0,
  );
}
export function filterProducts(
  products: Product[],
  department: string,
  category: string,
  query: string,
  sort: string,
) {
  const needle = query.trim().toLowerCase();
  const filtered = products.filter(
    (p) =>
      (department === "All" || p.department === department) &&
      (category === "All" || p.category === category) &&
      `${p.name} ${p.department} ${p.category} ${p.variants.map((v) => v.color).join(" ")}`
        .toLowerCase()
        .includes(needle),
  );
  if (sort === "price-asc" || sort === "price-desc")
    filtered.sort(
      (a, b) =>
        (Math.min(...a.variants.map((v) => v.price_vnd)) -
          Math.min(...b.variants.map((v) => v.price_vnd))) *
        (sort === "price-asc" ? 1 : -1),
    );
  return filtered;
}
