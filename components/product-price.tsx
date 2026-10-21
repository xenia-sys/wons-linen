import type { Variant } from "../lib/types";
import { money, unitPrice } from "../lib/commerce";
export function ProductPrice({
  variant,
}: {
  variant: Pick<Variant, "price_vnd" | "sale_price_vnd">;
}) {
  const price = unitPrice(variant);
  return (
    <span className={price < variant.price_vnd ? "has-sale-price" : undefined}>
      <span>{money(price)}</span>
      {price < variant.price_vnd && (
        <>
          <del>
            <span className="sr-only">Regular price </span>
            {money(variant.price_vnd)}
          </del>
          <span className="sale-label">Sale</span>
        </>
      )}
    </span>
  );
}
