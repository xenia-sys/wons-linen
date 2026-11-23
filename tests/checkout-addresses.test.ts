import assert from "node:assert/strict";
import test from "node:test";
import { checkoutAddresses } from "../lib/checkout-addresses.ts";
import type { Address } from "../lib/customer-account.ts";

const shipping: Address = {
  kind: "shipping", recipient: "Nguyễn An", line1: "123 Example street", line2: "Unit 1",
  city: "Hồ Chí Minh", region: "", postal_code: "700000", country: "Việt Nam",
};

test("a Vietnam shipping address works for both checkout fields when it is the only saved address", () => {
  const result = checkoutAddresses([shipping]);
  assert.equal(result.separate, false);
  assert.deepEqual(result.billing, result.shipping);
  assert.deepEqual(result.shipping, {
    firstName: "Nguyễn", lastName: "An", street: "123 Example street", unit: "Unit 1", city: "Hồ Chí Minh",
    province: "", postcode: "700000", country: "Vietnam",
  });
});

test("different saved addresses stay distinct; equal addresses need no duplicate fields", () => {
  const billing: Address = { ...shipping, kind: "billing", country: "VN" };
  assert.equal(checkoutAddresses([shipping, billing]).separate, false);
  const result = checkoutAddresses([shipping, { ...billing, line1: "Billing address" }]);
  assert.equal(result.separate, true);
  assert.equal(result.billing?.street, "Billing address");
  assert.equal(result.shipping?.street, shipping.line1);
});

test("checkout does not silently relabel a foreign address or invent a missing name", () => {
  assert.equal(checkoutAddresses([{ ...shipping, country: "France" }]).billing, undefined);
  const result = checkoutAddresses([{ ...shipping, recipient: "An", line1: "x".repeat(161) }]);
  assert.equal(result.billing?.firstName, "An");
  assert.equal(result.billing?.lastName, "");
  assert.equal(result.billing?.street, "");
});
