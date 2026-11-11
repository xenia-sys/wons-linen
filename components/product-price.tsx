"use client";
import type { Variant } from "../lib/types";
import { unitPrice } from "../lib/commerce";
import { useDisplayCurrency } from "./display-currency-provider";
export function ProductPrice({
  variant,
}: {
  variant: Pick<Variant, "price_vnd" | "sale_price_vnd">;
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
          <span className="sale-label">Sale</span>
        </>
      )}
    </span>
  );
}
