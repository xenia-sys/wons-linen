import type { Product } from "./types.ts";

type Arrival = Product & { created_at: string };

export function selectNewArrivals(catalog: readonly Arrival[]) {
  const published = catalog.filter(product => product.status === "published" && !product.is_demo);
  const eligible = published
    .filter(product => product.new_arrival !== false)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
      || a.sort_order - b.sort_order || a.slug.localeCompare(b.slug));
  const featured = eligible.filter(product => product.new_arrival === true);
  const automatic = eligible.filter(product => product.new_arrival == null).slice(0, Math.max(0, 12 - featured.length));
  const products = [...featured, ...automatic];
  return { products, preview: false };
}
