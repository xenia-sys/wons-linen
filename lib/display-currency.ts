import { money } from "./commerce.ts";

export type DisplayCurrency = "VND" | "USD";
export const DISPLAY_CURRENCY_KEY = "wons.currency.v1";

type UsdQuote = {
  base: "USD";
  quote: "VND";
  rate: number;
};

const usd = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function parseUsdQuote(value: unknown): UsdQuote | null {
  if (!value || typeof value !== "object") return null;
  const { base, quote, rate } = value as Record<string, unknown>;
  if (
    base !== "USD" || quote !== "VND" ||
    typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0
  ) return null;
  return { base, quote, rate };
}

export function formatDisplayPrice(amountVnd: number, quote?: UsdQuote | null) {
  return quote ? `≈ USD ${usd.format(amountVnd / quote.rate)}` : money(amountVnd);
}
