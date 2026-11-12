import test from "node:test";
import assert from "node:assert/strict";
import { parseOrder } from "../lib/orders.ts";
import { POST } from "../app/api/checkout/route.ts";
import { createTestCheckoutCookie, TEST_CHECKOUT_COOKIE, TEST_CHECKOUT_SECONDS, testCheckoutAllowed } from "../lib/test-checkout.ts";

const address = { firstName: " Sample ", lastName: "Guest", street: "Test street", city: "Sample City" };
const payload = {
  id: "e0a679f9-8bc3-4ac0-8884-94755fc1ef5f",
  email: " Sample@example.invalid ", phone: "0900-000-000",
  billing: address, delivery: { ...address, street: "Other street", country: "Vietnam" },
  items: [{ variantId: "805222af-6ce5-4e47-8d6b-3252bd54f4fb", quantity: 2, price: 790000 }],
};

test("guest details are normalized and shipping is always Vietnam", () => {
  const order = parseOrder(payload);
  assert.equal(order.email, "sample@example.invalid");
  assert.equal(order.phone, "0900000000");
  assert.equal(order.billing.country, "Vietnam");
  assert.equal(order.delivery.street, "Other street");
  assert.throws(() => parseOrder({ ...payload, delivery: { ...address, country: "France" } }), /Vietnam/);
  assert.throws(() => parseOrder({ ...payload, delivery: { ...address, street: "" } }), /street/);
});

test("checkout rejects duplicate items, fractional quantities and excessive total quantity", () => {
  const item = payload.items[0];
  for (const items of [[item, item], [{ ...item, quantity: 1.5 }], [{ ...item, price: "790000" }],
    Array.from({ length: 4 }, (_, i) => ({ ...item, quantity: 8, variantId: "805222af-6ce5-4e47-8d6b-3252bd54f4f" + i }))]) {
    assert.throws(() => parseOrder({ ...payload, items }));
  }
});

test("the Owner test grant expires and cannot be modified or reused with a different key", () => {
  const now = 1794460000000;
  const key = "a".repeat(64);
  const token = createTestCheckoutCookie(key, now);
  assert.ok(testCheckoutAllowed(token, key, now + 1000));
  assert.equal(testCheckoutAllowed(token, key, now + TEST_CHECKOUT_SECONDS * 1000), false);
  assert.equal(testCheckoutAllowed(token.replace(/^\d/, "2"), key, now), false);
  assert.equal(testCheckoutAllowed(token, "b".repeat(64), now), false);
});

test("guest endpoint blocks preview, checks origin and returns only the database receipt", async () => {
  const keys = ["VERCEL_ENV", "WONS_ORDER_GATEWAY_SECRET", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const originals = keys.map(key => process.env[key]);
  const actualFetch = globalThis.fetch;
  const site = "https://wons.test";
  const request = (origin = site, body: Record<string, unknown> = payload, cookie = "") => new Request(site + "/api/checkout", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie },
    body: JSON.stringify(body),
  });
  try {
    process.env.WONS_ORDER_GATEWAY_SECRET = "a".repeat(64);
    process.env.VERCEL_ENV = "preview";
    assert.equal((await POST(request())).status, 503);
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://database.test";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "fixture";
    assert.equal((await POST(request("https://unrelated.test"))).status, 403);
    globalThis.fetch = async (url, options) => {
      assert.equal(String(url), "https://database.test/rest/v1/rpc/submit_wons_order");
      const body = JSON.parse(String(options?.body));
      assert.equal(body.order_data.id, payload.id);
      assert.equal(body.order_data.delivery.country, "Vietnam");
      return Response.json({ order_number: 1, total_vnd: 1580000, email: payload.email });
    };
    const response = await POST(request());
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { order_number: 1, total_vnd: 1580000 });
    const sample = { ...payload, test: true, items: [{ ...payload.items[0], quantity: 1 }] };
    const denied = await POST(request(site, sample));
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).code, "TEST_SESSION_REQUIRED");
    const cookie = `${TEST_CHECKOUT_COOKIE}=${createTestCheckoutCookie("a".repeat(64))}`;
    globalThis.fetch = async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      assert.equal(body.order_data.test, true);
      assert.equal(body.order_data.items[0].quantity, 1);
      return Response.json({ order_number: 2, total_vnd: 790000 });
    };
    const testOrder = await POST(request(site, sample, cookie));
    assert.equal(testOrder.status, 201);
    assert.deepEqual(await testOrder.json(), { order_number: 2, total_vnd: 790000 });
    globalThis.fetch = async () => Response.json({ code: "WN001", message: "private database detail" }, { status: 400 });
    const changed = await POST(request());
    assert.equal(changed.status, 409);
    assert.equal((await changed.json()).code, "BAG_CHANGED");
  } finally {
    globalThis.fetch = actualFetch;
    keys.forEach((key, index) => {
      if (originals[index] === undefined) delete process.env[key];
      else process.env[key] = originals[index];
    });
  }
});
