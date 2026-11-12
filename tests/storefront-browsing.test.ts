import { test } from "node:test";
import assert from "node:assert/strict";
import { selectNewArrivals } from "../lib/new-arrivals.ts";
import { gallerySwipeDirection } from "../lib/product-gallery.ts";
import type { Product } from "../lib/types.ts";

const style = (slug: string, day: number, options: Partial<Product> = {}) => ({
  id: slug, slug, name: slug, department: "Women", category: "Shirts",
  status: "published", is_demo: false, description: "", sort_order: 0, variants: [],
  ...options, created_at: `2026-11-${String(day).padStart(2, "0")}T00:00:00Z`,
} satisfies Product & { created_at: string });

test("new arrivals lists the latest twelve real styles across departments", () => {
  const real = Array.from({ length: 13 }, (_, i) => style(`style-${i + 1}`, i + 1,
    { department: i % 2 ? "Men" : "Women" }));
  const demo = style("demo", 30, { is_demo: true, status: "preview" });
  const publishedDemo = style("published-demo", 28, { is_demo: true });
  const result = selectNewArrivals([...real, demo, publishedDemo]);
  assert.equal(result.preview, false);
  assert.deepEqual(result.products.map(p => p.slug), real.slice(1).reverse().map(p => p.slug));
});

test("preview styles are labeled and disappear when the first real style is published", () => {
  const demo = style("demo", 3, { is_demo: true, status: "preview" });
  const real = style("real", 2);
  assert.deepEqual(selectNewArrivals([demo]), { products: [demo], preview: true });
  assert.deepEqual(selectNewArrivals([demo, real]), { products: [real], preview: false });
  assert.deepEqual(selectNewArrivals([]), { products: [], preview: false });
});

test("gallery changes one image for a deliberate horizontal swipe", () => {
  assert.equal(gallerySwipeDirection(-90, 12), 1);
  assert.equal(gallerySwipeDirection(90, -15), -1);
  assert.equal(gallerySwipeDirection(14, 2), 0);
  assert.equal(gallerySwipeDirection(-85, 100), 0);
  assert.equal(gallerySwipeDirection(75, 60), 0);
});
