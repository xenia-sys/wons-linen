import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUCT_CATEGORIES, type Category } from "../lib/product-categories.ts";
import { parseProductDraft } from "../lib/admin-validation.ts";
import { translateAdmin } from "../lib/admin-i18n.ts";
import { filterProducts } from "../lib/commerce.ts";
import { selectNewArrivals } from "../lib/new-arrivals.ts";
import type { Product } from "../lib/types.ts";

const variant = { sku: "CATEGORY-FIXTURE", color: "Ivory", color_hex: "#ffffff", size: "Free size",
  price_vnd: 790000, sale_price_vnd: null, available_quantity: 3 };
const draft = { name: "Category fixture", slug: "category-fixture", description: "",
  department: "Women", status: "hidden", is_demo: false, sort_order: 0, variants: [variant], images: [] };
const product = (id: string, category: Category, department: "Women" | "Men"): Product & { created_at: string } => ({
  ...draft, id, slug: id, name: id, category, department, status: "published", variants: [{ ...variant, id }],
  created_at: "2026-11-20T00:00:00Z",
});

test("admin accepts Skirts and Shorts with Free size while preserving all existing categories", () => {
  for (const category of PRODUCT_CATEGORIES) {
    const parsed = parseProductDraft({ ...draft, category });
    assert.equal(parsed.category, category);
    assert.equal(parsed.variants[0].size, "Free size");
  }
  for (const category of ["Skirt", "Short", "shoes", "skirts", "", null, {}])
    assert.throws(() => parseProductDraft({ ...draft, category }), /valid department/);
  assert.equal(translateAdmin("vi", "Skirts"), "Chân váy");
  assert.equal(translateAdmin("vi", "Shorts"), "Quần short");
});

test("Skirts and Shorts filters keep Women, Men and other categories separate", () => {
  const products = [
    product("women-skirt", "Skirts", "Women"),
    product("women-short", "Shorts", "Women"),
    product("men-short", "Shorts", "Men"),
    product("trousers", "Trousers", "Men"),
  ];
  assert.deepEqual(filterProducts(products, "All", "Skirts", "", "featured").map(p => p.id), ["women-skirt"]);
  assert.deepEqual(filterProducts(products, "All", "Shorts", "", "featured").map(p => p.id), ["women-short", "men-short"]);
  assert.deepEqual(filterProducts(products, "Women", "Shorts", "", "featured").map(p => p.id), ["women-short"]);
  assert.deepEqual(filterProducts(products, "Men", "Shorts", "", "featured").map(p => p.id), ["men-short"]);
  assert.deepEqual(filterProducts(products, "Men", "Skirts", "", "featured"), []);
});

test("New Arrivals retains new categories and supports the same category filters", () => {
  const skirt = { ...product("new-skirt", "Skirts", "Women"), new_arrival: true };
  const shorts = { ...product("new-shorts", "Shorts", "Men"), new_arrival: true };
  const removed = { ...product("removed", "Shorts", "Women"), new_arrival: false };
  const result = selectNewArrivals([skirt, shorts, removed]);
  assert.equal(result.preview, false);
  assert.deepEqual(filterProducts(result.products, "All", "Skirts", "", "featured").map(p => p.id), ["new-skirt"]);
  assert.deepEqual(filterProducts(result.products, "Men", "Shorts", "", "featured").map(p => p.id), ["new-shorts"]);
});
