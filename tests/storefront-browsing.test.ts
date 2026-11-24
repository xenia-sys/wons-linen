import { test } from "node:test";
import assert from "node:assert/strict";
import { selectNewArrivals } from "../lib/new-arrivals.ts";
import { galleryDragOffset, galleryIndex, gallerySwipeDirection, preferredColour, cardHoverImage, shareImage, colourPhotos } from "../lib/product-gallery.ts";
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

test("demo styles never return, even when no real style is published", () => {
  const demo = style("demo", 3, { is_demo: true, status: "preview" });
  const real = style("real", 2);
  assert.deepEqual(selectNewArrivals([demo]), { products: [], preview: false });
  assert.deepEqual(selectNewArrivals([demo, real]), { products: [real], preview: false });
  assert.deepEqual(selectNewArrivals([]), { products: [], preview: false });
});

test("New Arrivals features chosen styles, excludes removed ones, and retains their departments", () => {
  const featured = style("chosen-style", 1, { department: "Men", new_arrival: true });
  const automatic = style("newer-style", 11);
  const removed = style("removed-style", 12, { new_arrival: false });
  const preview = style("preview-style", 14, { status: "preview", is_demo: true, new_arrival: true });
  assert.deepEqual(selectNewArrivals([automatic, removed, preview, featured]), {
    products: [featured, automatic], preview: false,
  });
  assert.equal(selectNewArrivals([featured]).products[0].department, "Men");
  assert.deepEqual(selectNewArrivals([removed, preview]), { products: [], preview: false });
});

test("gallery changes one image for a deliberate horizontal swipe", () => {
  assert.equal(gallerySwipeDirection(-90, 12), 1);
  assert.equal(gallerySwipeDirection(90, -15), -1);
  assert.equal(gallerySwipeDirection(14, 2), 0);
  assert.equal(gallerySwipeDirection(-85, 100), 0);
  assert.equal(gallerySwipeDirection(75, 60), 0);
  assert.equal(gallerySwipeDirection(-28, 4, 600), 0);
  assert.equal(gallerySwipeDirection(-28, 4, 600, -0.6), 1);
  assert.equal(gallerySwipeDirection(-28, 4, 600, 0.6), 0);
});

test("gallery follows a drag between images and resists the ends", () => {
  assert.equal(galleryDragOffset(-120, 500, 0, 3), -120);
  assert.equal(galleryDragOffset(600, 500, 1, 3), 500);
  assert.ok(galleryDragOffset(120, 500, 0, 3) < 30);
  assert.ok(galleryDragOffset(-120, 500, 2, 3) > -30);
  assert.equal(galleryIndex(-1, 3), 0);
  assert.equal(galleryIndex(3, 3), 2);
});

test("a product opens on the first colour that has its own photography", () => {
  const variant = (color: string) => ({ id: color, sku: color, color, color_hex: "#000000", size: "S", price_vnd: 100, available_quantity: 1 });
  const image = (id: string, color?: string) => ({ id, src: `/${id}.jpg`, alt: id, color });
  const variants = ["Olive", "Black", "White"].map(variant);
  assert.equal(preferredColour(style("pictured", 1, { variants, images: [image("a", "White"), image("b", "Black")] })), "White");
  assert.equal(preferredColour(style("shared", 1, { variants, images: [image("a"), image("b", "Black")] })), "Black");
  assert.equal(preferredColour(style("unmatched", 1, { variants, images: [image("a", "Navy")] })), "Olive");
  assert.equal(preferredColour(style("unpictured", 1, { variants })), "Olive");
});

test("a shared product link shows a photo of the colour the page opens on", () => {
  const variant = (color: string) => ({ id: color, sku: color, color, color_hex: "#000000", size: "S", price_vnd: 100, available_quantity: 1 });
  const image = (id: string, color?: string) => ({ id, src: `/${id}.jpg`, alt: id, color });
  const variants = ["Olive", "White"].map(variant);
  assert.equal(shareImage(style("pictured", 1, { variants, images: [image("shared"), image("w1", "White"), image("w2", "White")] }))?.id, "w1");
  assert.equal(shareImage(style("shared only", 1, { variants, images: [image("shared")] }))?.id, "shared");
  assert.equal(shareImage(style("unpictured", 1, { variants }))?.id, undefined);
});

test("catalog cards reveal the cover colour's back view, then its next photo", () => {
  const image = (id: string, alt: string, color?: string) => ({ id, src: `/${id}.jpg`, alt, color });
  const cards = (images: ReturnType<typeof image>[]) => cardHoverImage(style("card", 1, { images }))?.id;
  assert.equal(cards([image("a", "Front view", "White"), image("b", "Close-up", "White"), image("c", "Back view of it", "White")]), "c");
  assert.equal(cards([image("a", "Front view", "White"), image("b", "Back view", "Black"), image("c", "Styled view", "White")]), "c");
  assert.equal(cards([image("a", "Front view", "White"), image("b", "Close-up")]), "b");
  assert.equal(cards([image("a", "Front view", "White")]), undefined);
  assert.equal(cards([]), undefined);
});

test("a colour without its own photos shows every product photo", () => {
  const image = (id: string, color?: string) => ({ id, src: `/${id}.jpg`, alt: id, color });
  const product = style("gallery", 1, { images: [image("n1", "Navy"), image("n2", "Navy"), image("shared")] });
  const ids = (color: string) => colourPhotos(product, color).map((i) => i.id);
  assert.deepEqual(ids("Navy"), ["n1", "n2", "shared"]);
  assert.deepEqual(ids("Red"), ["n1", "n2", "shared"]);
  const mixed = style("mixed", 1, { images: [image("n1", "Navy"), image("w1", "White"), image("shared")] });
  assert.deepEqual(colourPhotos(mixed, "White").map((i) => i.id), ["w1", "shared"]);
  assert.deepEqual(colourPhotos(mixed, "Olive").map((i) => i.id), ["n1", "w1", "shared"]);
});
