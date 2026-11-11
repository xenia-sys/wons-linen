import assert from "node:assert/strict";
import test from "node:test";
import { formatDisplayPrice, parseUsdQuote } from "../lib/display-currency.ts";

test("USD is an estimated display conversion of the VND amount", () => {
  const quote = parseUsdQuote({ base: "USD", quote: "VND", rate: 25000 });
  assert.ok(quote);
  assert.equal(formatDisplayPrice(998750, quote), "≈ USD 39.95");
  assert.equal(formatDisplayPrice(998750), "VND 998,750");
});

test("invalid or reversed quotes do not produce USD prices", () => {
  for (const quote of [
    null,
    { base: "VND", quote: "USD", rate: 0.00004 },
    { base: "USD", quote: "VND", rate: "25000" },
    { base: "USD", quote: "VND", rate: 0 },
    { base: "USD", quote: "VND", rate: Infinity },
  ]) {
    assert.equal(parseUsdQuote(quote), null);
  }
});
