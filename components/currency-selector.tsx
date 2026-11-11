"use client";
import { useDisplayCurrency } from "./display-currency-provider";

export function CurrencySelector() {
  const { requested, pending, unavailable, choose } = useDisplayCurrency();

  return (
    <div className="currency-picker">
      <select
        className="currency-select"
        aria-label="Display currency"
        aria-describedby="display-currency-status"
        value={requested}
        onChange={(event) => choose(event.target.value === "USD" ? "USD" : "VND")}
      >
        <option value="VND">VND</option>
        <option value="USD">USD</option>
      </select>
      <span id="display-currency-status" className="currency-status" role="status">
        {pending ? "Loading USD prices…" : unavailable ? "USD prices are temporarily unavailable. Showing VND." : ""}
      </span>
    </div>
  );
}
