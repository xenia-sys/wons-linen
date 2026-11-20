import { test } from "node:test";
import assert from "node:assert/strict";
import { FREE_SIZE, PRODUCT_SIZES, isFreeSizeProduct, selectedSizeForColour } from "../lib/product-sizes.ts";
import { parseProductDraft } from "../lib/admin-validation.ts";
import { addToCart, resolveCart, subtotal } from "../lib/commerce.ts";
import { translateAdmin } from "../lib/admin-i18n.ts";
import type { Product } from "../lib/types.ts";

const variants = [
  { id: "cfa14151-9f82-470e-9d38-dbe30f6941eb", sku: "WONS-IVORY-FS", color: "Ivory", color_hex: "#ffffff", size: FREE_SIZE, price_vnd: 790000, available_quantity: 3 },
  { id: "7993e8a2-7639-416f-b12b-9d8dfaa24f94", sku: "WONS-SAND-FS", color: "Sand", color_hex: "#b6a38a", size: FREE_SIZE, price_vnd: 790000, available_quantity: 0 },
];
const product: Product = {
  id: "free", slug: "free-size-shirt", name: "Free size shirt", department: "Women",
  category: "Shirts", description: "", status: "published", is_demo: false, sort_order: 0, variants,
};
const draft = { ...product, id: undefined, status: "hidden", images: [] };

test("admin accepts Free size alongside existing sizes and rejects arbitrary values", () => {
  for (const size of PRODUCT_SIZES) {
    const parsed = parseProductDraft({ ...draft, variants: [{ ...variants[0], size }] });
    assert.equal(parsed.variants[0].size, size);
  }
  for (const size of ["OS", "FS", "free size", "One size", "", "XXXXL"]) {
    assert.throws(() => parseProductDraft({ ...draft, variants: [{ ...variants[0], size }] }));
  }
  assert.throws(() => parseProductDraft({
    ...draft, variants: [variants[0], { ...variants[0], sku: "SECOND-FREE" }],
  }), /unique/);
  assert.equal(translateAdmin("vi", FREE_SIZE), "Free size (một cỡ)");
});

test("only exclusively Free size products receive the catalog label", () => {
  assert.equal(isFreeSizeProduct(variants), true);
  assert.equal(isFreeSizeProduct([]), false);
  assert.equal(isFreeSizeProduct([{ size: "M" }]), false);
  assert.equal(isFreeSizeProduct([...variants, { size: "S" }]), false);
});

test("a single available Free size auto-selects while sold-out and sized variants require a choice", () => {
  assert.equal(selectedSizeForColour(variants, "Ivory"), FREE_SIZE);
  assert.equal(selectedSizeForColour(variants, "Sand", FREE_SIZE), "");
  assert.equal(selectedSizeForColour(variants, "Unknown"), "");
  const mixed = [...variants, { ...variants[0], size: "M" }];
  assert.equal(selectedSizeForColour(mixed, "Ivory"), "");
  assert.equal(selectedSizeForColour(mixed, "Ivory", "M"), "M");
  assert.equal(selectedSizeForColour(mixed, "Ivory", FREE_SIZE), FREE_SIZE);
  assert.equal(selectedSizeForColour([{ ...variants[0], size: "M" }], "Ivory"), "");
});

test("Free size stays attached to the correct colour in the bag and respects stock limits", () => {
  const bag = addToCart([], [product], variants[0].id, 5);
  assert.deepEqual(bag, [{ variantId: variants[0].id, quantity: 3 }]);
  const lines = resolveCart(bag, [product]);
  assert.equal(lines[0].variant.size, FREE_SIZE);
  assert.equal(lines[0].variant.color, "Ivory");
  assert.equal(subtotal(lines), 2370000);
  assert.deepEqual(addToCart(bag, [product], variants[1].id), bag);
});
