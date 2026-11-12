import type { Product } from "./types.ts";

type Arrival = Product & { created_at: string };

export function selectNewArrivals(catalog: readonly Arrival[]) {
  const published = catalog.filter(product => product.status === "published" && !product.is_demo);
  const preview = published.length === 0;
  const products = (preview ? catalog.filter(product => product.status === "preview" && product.is_demo) : published)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
      || a.sort_order - b.sort_order || a.slug.localeCompare(b.slug))
    .slice(0, 12);
  return { products, preview: preview && products.length > 0 };
}
