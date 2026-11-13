"use client";
import { useDisplayCurrency } from "./display-currency-provider";

export function CurrencySelector({ statusId = "display-currency-status" }: { statusId?: string }) {
  const { requested, pending, unavailable, choose } = useDisplayCurrency();

  return (
    <div className="currency-picker">
      <select
        className="currency-select"
        aria-label="Display currency"
        aria-describedby={statusId}
        value={requested}
        onChange={(event) => choose(event.target.value === "USD" ? "USD" : "VND")}
      >
        <option value="VND">VND</option>
        <option value="USD">USD</option>
      </select>
      <span id={statusId} className="currency-status" role="status">
        {pending ? "Loading USD prices…" : unavailable ? "USD prices are temporarily unavailable. Showing VND." : ""}
      </span>
    </div>
  );
}
