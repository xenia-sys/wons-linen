"use client";
import type { Variant } from "../lib/types";
import { unitPrice } from "../lib/commerce";
import { useDisplayCurrency } from "./display-currency-provider";
export function ProductPrice({
  variant,
}: {
  variant: Pick<Variant, "price_vnd" | "sale_price_vnd" | "discount_percent">;
}) {
  const { format } = useDisplayCurrency();
  const price = unitPrice(variant);
  return (
    <span className={price < variant.price_vnd ? "has-sale-price" : undefined}>
      <span>{format(price)}</span>
      {price < variant.price_vnd && (
        <>
          <del>
            <span className="sr-only">Regular price </span>
            {format(variant.price_vnd)}
          </del>
          <span className="sale-label">{variant.discount_percent ? `−${variant.discount_percent}%` : "Sale"}</span>
        </>
      )}
    </span>
  );
}
