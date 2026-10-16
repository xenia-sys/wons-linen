import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCart,
  addToCart,
  setQuantity,
  resolveCart,
  subtotal,
  filterProducts,
} from "../lib/commerce.ts";
import type { Product } from "../lib/types.ts";
import { POST } from "../app/api/checkout/route.ts";
const products: Product[] = [
  {
    id: "women",
    slug: "shirt",
    name: "Relaxed Shirt",
    department: "Women",
    category: "Shirts",
    description: "",
    is_demo: true,
    status: "preview",
    sort_order: 0,
    variants: [
      {
        id: "w-s",
        sku: "W-S",
        color: "Ivory",
        color_hex: "#ffffff",
        size: "S",
        price_vnd: 790000,
        available_quantity: 3,
      },
      {
        id: "w-m",
        sku: "W-M",
        color: "Ivory",
        color_hex: "#ffffff",
        size: "M",
        price_vnd: 790000,
        available_quantity: 2,
      },
      {
        id: "sold",
        sku: "SOLD",
        color: "Sand",
        color_hex: "#b6a38a",
        size: "L",
        price_vnd: 800000,
        available_quantity: 0,
      },
    ],
  },
  {
    id: "men",
    slug: "trousers",
    name: "Relaxed Trousers",
    department: "Men",
    category: "Trousers",
    description: "",
    is_demo: true,
    status: "preview",
    sort_order: 1,
    variants: [
      {
        id: "m-l",
        sku: "M-L",
        color: "Sand",
        color_hex: "#b6a38a",
        size: "L",
        price_vnd: 1090000,
        available_quantity: 15,
      },
    ],
  },
];
test("same SKU merges, while size and department remain separate", () => {
  let cart = addToCart([], products, "w-s");
  cart = addToCart(cart, products, "w-s");
  cart = addToCart(cart, products, "w-m");
  cart = addToCart(cart, products, "m-l");
  assert.deepEqual(cart, [
    { variantId: "w-s", quantity: 2 },
    { variantId: "w-m", quantity: 1 },
    { variantId: "m-l", quantity: 1 },
  ]);
  assert.equal(subtotal(resolveCart(cart, products)), 3460000);
});
test("missing, sold-out and unknown variants cannot be added", () => {
  for (const id of ["", "unknown", "sold"])
    assert.deepEqual(addToCart([], products, id), []);
});
test("quantities cannot exceed variant availability or per-variant limit", () => {
  assert.deepEqual(addToCart([], products, "w-s", 99), [
    { variantId: "w-s", quantity: 3 },
  ]);
  assert.deepEqual(addToCart([], products, "m-l", 99), [
    { variantId: "m-l", quantity: 10 },
  ]);
});
test("negative, fractional and non-finite add quantities are rejected", () => {
  for (const quantity of [-1, 0, 1.5, NaN, Infinity])
    assert.deepEqual(addToCart([], products, "w-s", quantity), []);
});
test("quantity zero removes, invalid updates preserve, valid updates recalculate", () => {
  const cart = [{ variantId: "w-s", quantity: 2 }];
  assert.deepEqual(setQuantity(cart, products, "w-s", 0), []);
  assert.deepEqual(setQuantity(cart, products, "w-s", -1), cart);
  assert.deepEqual(setQuantity(cart, products, "w-s", 1.1), cart);
  assert.equal(
    subtotal(resolveCart(setQuantity(cart, products, "w-s", 3), products)),
    2370000,
  );
});
test("stored price tampering is ignored and malformed storage is sanitized", () => {
  const input = [
    null,
    {},
    { variantId: "w-s", quantity: 2, price_vnd: 1 },
    { variantId: "w-s", quantity: 9 },
    { variantId: "m-l", quantity: "2" },
    { variantId: "removed", quantity: 1 },
    { variantId: "sold", quantity: 1 },
  ];
  assert.deepEqual(normalizeCart(input, products), [
    { variantId: "w-s", quantity: 3 },
  ]);
  assert.equal(
    subtotal(resolveCart(normalizeCart(input, products), products)),
    2370000,
  );
  assert.deepEqual(normalizeCart({}, products), []);
});
test("restoring a bag revalidates a changed catalog and reduced availability", () => {
  const changed = structuredClone(products);
  changed[0].variants[0].available_quantity = 1;
  assert.deepEqual(
    normalizeCart(
      [
        { variantId: "w-s", quantity: 3 },
        { variantId: "removed", quantity: 2 },
      ],
      changed,
    ),
    [{ variantId: "w-s", quantity: 1 }],
  );
});
test("Women and Men category filters do not mix departments", () => {
  assert.equal(
    filterProducts(products, "Women", "Shirts", "", "featured").length,
    1,
  );
  assert.equal(
    filterProducts(products, "Men", "Shirts", "", "featured").length,
    0,
  );
  assert.equal(
    filterProducts(products, "Men", "Trousers", "", "featured")[0].id,
    "men",
  );
});
test("search is trimmed, case insensitive and has an empty result state", () => {
  assert.equal(
    filterProducts(products, "All", "All", "  IVORY ", "featured")[0].id,
    "women",
  );
  assert.deepEqual(
    filterProducts(products, "All", "All", "nonexistent", "featured"),
    [],
  );
});
test("price sorting does not mutate the original catalog", () => {
  assert.equal(
    filterProducts(products, "All", "All", "", "price-desc")[0].id,
    "men",
  );
  assert.equal(products[0].id, "women");
});
test("checkout fails closed even if an environment flag is switched on", async () => {
  const previous = process.env.CHECKOUT_ENABLED;
  try {
    process.env.CHECKOUT_ENABLED = "true";
    const response = await POST();
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "CHECKOUT_NOT_OPEN");
  } finally {
    if (previous === undefined) delete process.env.CHECKOUT_ENABLED;
    else process.env.CHECKOUT_ENABLED = previous;
  }
});
