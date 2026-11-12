import test from "node:test";
import assert from "node:assert/strict";
import { discountEventStatus, parseDiscountEvent, vietnamDateTime } from "../lib/discount-events.ts";
import { percentagePrice, subtotal, unitPrice } from "../lib/commerce.ts";
import type { ResolvedLine } from "../lib/types.ts";

const id = "25f13db6-08d9-438f-b1ce-209f0ce2e946";
const form = { name: " Linen weekend ", percent_off: 20, starts_at: "2026-11-20T09:00", ends_at: "2026-11-22T23:00", product_ids: [id], enabled: true };

test("event scheduling uses Vietnam time and an exclusive end", () => {
  const event = { ...parseDiscountEvent(form), id };
  assert.equal(event.starts_at, "2026-11-20T02:00:00.000Z");
  assert.equal(vietnamDateTime(event.ends_at), form.ends_at);
  assert.equal(discountEventStatus(event, Date.parse(event.starts_at) - 1), "Scheduled");
  assert.equal(discountEventStatus(event, Date.parse(event.starts_at)), "Active");
  assert.equal(discountEventStatus(event, Date.parse(event.ends_at)), "Ended");
  assert.equal(discountEventStatus({ ...event, enabled: false }, Date.parse(event.starts_at)), "Paused");
});

test("event validation rejects invalid discounts, dates and empty assignments", () => {
  for (const override of [{ percent_off: 100 }, { percent_off: 10.5 }, { starts_at: "2026-02-31T10:30" },
    { ends_at: form.starts_at }, { product_ids: [] }, { product_ids: ["unknown"] }])
    assert.throws(() => parseDiscountEvent({ ...form, ...override }));
});

test("event discount applies to base price and checkout subtotal uses that price", () => {
  assert.equal(percentagePrice(105, 10), 95);
  assert.equal(percentagePrice(1, 99), 1);
  const variant = { id: "fixture", sku: "TEST", color: "Ivory", color_hex: "#ffffff", size: "M",
    price_vnd: 790000, sale_price_vnd: 690000, discount_percent: 20, available_quantity: 3 };
  assert.equal(unitPrice(variant), 632000);
  const line = { variant, variantId: variant.id, quantity: 2, product: { id, slug: "test", name: "Test",
    category: "Shirts", department: "Women", description: "", is_demo: false, status: "published", sort_order: 0, variants: [variant] } } satisfies ResolvedLine;
  assert.equal(subtotal([line]), 1264000);
  assert.equal(unitPrice({ ...variant, discount_percent: undefined }), 690000);
});
