import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseProductDraft,
  parseStaff,
  imageFileType,
} from "../lib/admin-validation.ts";
import {
  filterProducts,
  normalizeCart,
  resolveCart,
  subtotal,
  unitPrice,
} from "../lib/commerce.ts";
import type { Product } from "../lib/types.ts";
const pid = "d24e4636-500e-45ba-bf51-99b67ac58503";
const imageId = "3baa44ce-d2d0-45df-905e-41b1a0dd17cd";
function draft() {
  return {
    id: pid,
    version: 2,
    name: " Linen Shirt ",
    slug: "linen-shirt",
    description: "Light linen",
    department: "Men",
    category: "Shirts",
    status: "hidden",
    is_demo: false,
    sort_order: 0,
    variants: [
      {
        sku: "WONS-M-S",
        color: "Ivory",
        color_hex: "#eee7d7",
        size: "S",
        price_vnd: 900000,
        sale_price_vnd: 700000,
        available_quantity: 3,
      },
    ],
    images: [],
  };
}
test("product input is normalized and cannot smuggle permissions or audit fields", () => {
  const parsed = parseProductDraft({
    ...draft(),
    role: "owner",
    actor_email: "fake@example.invalid",
    created_at: "2000-01-01",
  });
  assert.equal(parsed.name, "Linen Shirt");
  assert.equal(parsed.variants[0].sale_price_vnd, 700000);
  for (const key of ["role", "actor_email", "created_at"])
    assert.ok(!(key in parsed));
});
test("sale prices must be positive whole VND values below the regular price", () => {
  for (const value of [0, -1, 900000, 1000000, 1.5, NaN, Infinity, "700000"]) {
    const p = draft();
    p.variants[0].sale_price_vnd = value as number;
    assert.throws(() => parseProductDraft(p));
  }
  const p = draft();
  p.variants[0].sale_price_vnd = null as unknown as number;
  assert.equal(parseProductDraft(p).variants[0].sale_price_vnd, null);
});
test("existing products require a version; quantities and regular prices are validated", () => {
  assert.throws(() => parseProductDraft({ ...draft(), version: undefined }));
  for (const [field, value] of [
    ["price_vnd", 0],
    ["available_quantity", -1],
    ["available_quantity", 1.5],
  ] as const) {
    const p = draft();
    p.variants[0][field] = value;
    assert.throws(() => parseProductDraft(p));
  }
});
test("duplicate SKUs or colour-size pairs cannot be saved", () => {
  const p = draft();
  p.variants.push({ ...p.variants[0], size: "M" });
  assert.throws(() => parseProductDraft(p), /unique/);
  p.variants[1].sku = "OTHER";
  p.variants[1].size = "S";
  assert.throws(() => parseProductDraft(p), /unique/);
});
test("real publication requires images and preview remains restricted to demo products", () => {
  assert.throws(
    () => parseProductDraft({ ...draft(), status: "published" }),
    /photography/,
  );
  assert.throws(
    () => parseProductDraft({ ...draft(), status: "preview" }),
    /demo/,
  );
  assert.equal(
    parseProductDraft({
      ...draft(),
      status: "published",
      images: [
        {
          storage_path: `${pid}/${imageId}.webp`,
          alt: "Ivory linen shirt, front view",
          color: "Ivory",
        },
      ],
    }).status,
    "published",
  );
});
test("gallery validates product ownership, alt text, colour matching and duplicates", () => {
  const valid = {
    storage_path: `${pid}/${imageId}.webp`,
    alt: "Front view",
    color: null,
  };
  for (const image of [
    { ...valid, storage_path: `${imageId}/${imageId}.webp` },
    { ...valid, storage_path: `${pid}/../file.webp` },
    { ...valid, storage_path: `https://example.invalid/image.jpg` },
    { ...valid, alt: "" },
    { ...valid, color: "Black" },
  ])
    assert.throws(() => parseProductDraft({ ...draft(), images: [image] }));
  assert.throws(
    () => parseProductDraft({ ...draft(), images: [valid, valid] }),
    /once/,
  );
});
test("approved staff emails are normalized and roles are allowlisted", () => {
  assert.deepEqual(
    parseStaff({
      email: " Marketing@Example.com ",
      display_name: " Linh ",
      role: "marketing_editor",
      active: true,
      secret: "ignored",
    }),
    {
      email: "marketing@example.com",
      display_name: "Linh",
      role: "marketing_editor",
      active: true,
    },
  );
  for (const input of [
    { email: "bad", role: "owner", active: true },
    { email: "a@b.com", role: "super_admin", active: true },
    { email: "a@b.com", role: "owner", active: "true" },
  ])
    assert.throws(() => parseStaff(input));
});
test("image formats are checked by file signature, rejecting SVG and HTML", () => {
  assert.equal(imageFileType(new Uint8Array([255, 216, 255, 0]))?.ext, "jpg");
  assert.equal(
    imageFileType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))?.ext,
    "png",
  );
  assert.equal(
    imageFileType(new TextEncoder().encode("RIFF1234WEBP1234"))?.ext,
    "webp",
  );
  for (const value of [
    '<svg onload="alert(1)">',
    "<!doctype html>",
    "not a file",
  ])
    assert.equal(imageFileType(new TextEncoder().encode(value)), null);
});
test("catalog sorting and bag totals use current sale prices and ignore stored prices", () => {
  const base = draft();
  const products: Product[] = [
    {
      ...base,
      id: pid,
      department: "Men",
      category: "Shirts",
      status: "published",
      variants: [{ ...base.variants[0], id: "sale" }],
    },
    {
      ...base,
      id: "second",
      department: "Women",
      category: "Shirts",
      status: "published",
      variants: [
        {
          ...base.variants[0],
          id: "regular",
          price_vnd: 800000,
          sale_price_vnd: null,
        },
      ],
    },
  ];
  assert.equal(
    filterProducts(products, "All", "All", "", "price-asc")[0].id,
    pid,
  );
  const lines = normalizeCart(
    [{ variantId: "sale", quantity: 2, price_vnd: 1, sale_price_vnd: 1 }],
    products,
  );
  assert.equal(subtotal(resolveCart(lines, products)), 1400000);
  products[0].variants[0].sale_price_vnd = 650000;
  assert.equal(subtotal(resolveCart(lines, products)), 1300000);
  products[0].variants[0].sale_price_vnd = null;
  assert.equal(subtotal(resolveCart(lines, products)), 1800000);
});
test("invalid or absent discounts fall back to regular prices", () => {
  for (const sale_price_vnd of [undefined, null, 0, -1, 100000, 110000])
    assert.equal(unitPrice({ price_vnd: 100000, sale_price_vnd }), 100000);
});
