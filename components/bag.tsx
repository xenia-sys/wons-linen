"use client";
import Link from "next/link";
import Image from "next/image";
import { useBag } from "./cart-provider";
import { MAX_PER_VARIANT, subtotal, unitPrice } from "../lib/commerce";
import { useDisplayCurrency } from "./display-currency-provider";
import { GarmentArt } from "./garment-art";
import { Arrow } from "./icons";
export function Bag({ enabled }: { enabled: boolean }) {
  const { lines, ready, count, storageAvailable, update, remove } = useBag();
  const { currency, format } = useDisplayCurrency();
  const canOrder = enabled && lines.every(line => line.product.status === "published" && !line.product.is_demo);
  return (
    <section className="bag-page section-space">
      <div className="section-heading">
        <div>
          <p className="eyebrow">A FEW GOOD THINGS</p>
          <h1>
            Your shopping bag<span className="title-count">({count})</span>
          </h1>
        </div>
        <Link href="/shop" className="underlined-link">
          Continue exploring <Arrow />
        </Link>
      </div>
      {!ready ? (
        <p role="status">Loading your bag…</p>
      ) : !lines.length ? (
        <div className="empty-state">
          <span className="empty-mark" aria-hidden="true">
            W.
          </span>
          <h2>A little room for something lovely.</h2>
          <p>Your bag is empty. Find your everyday favourites.</p>
          <Link href="/shop" className="button dark">
            Explore the collection <Arrow />
          </Link>
        </div>
      ) : (
        <div className="bag-layout">
          <div>
            <div className="bag-table-heading">
              <span>YOUR SELECTION</span>
              <span>SUBTOTAL</span>
            </div>
            <ul className="bag-items">
              {lines.map((line) => {
                const cover =
                  line.product.images?.find(
                    (i) => i.color === line.variant.color,
                  ) ?? line.product.images?.find((i) => !i.color);
                return (
                  <li key={line.variantId} className="bag-item">
                    <Link
                      href={`/products/${line.product.slug}`}
                      className="bag-thumbnail"
                      aria-label={line.product.name}
                    >
                      {cover ? (
                        <Image
                          src={cover.src}
                          alt=""
                          width={160}
                          height={200}
                          style={{
                            objectFit: "cover",
                            width: "100%",
                            height: "100%",
                          }}
                        />
                      ) : (
                        <GarmentArt
                          category={line.product.category}
                          color={line.variant.color_hex}
                        />
                      )}
                    </Link>
                    <div className="bag-item-info">
                      <Link
                        href={`/products/${line.product.slug}`}
                        className="bag-product-name"
                      >
                        {line.product.name}
                      </Link>
                      <p>
                        {line.variant.color} / Size {line.variant.size}
                      </p>
                      <p>{format(unitPrice(line.variant))}</p>
                      <div className="quantity-row">
                        <div className="quantity-control">
                          <button
                            aria-label={`Decrease quantity of ${line.product.name}, ${line.variant.color}, ${line.variant.size}`}
                            disabled={line.quantity <= 1}
                            onClick={() =>
                              update(line.variantId, line.quantity - 1)
                            }
                          >
                            −
                          </button>
                          <span aria-label="Quantity">{line.quantity}</span>
                          <button
                            aria-label={`Increase quantity of ${line.product.name}, ${line.variant.color}, ${line.variant.size}`}
                            disabled={
                              line.quantity >=
                              Math.min(
                                MAX_PER_VARIANT,
                                line.variant.available_quantity,
                              )
                            }
                            onClick={() =>
                              update(line.variantId, line.quantity + 1)
                            }
                          >
                            +
                          </button>
                        </div>
                        <button
                          className="remove-button"
                          aria-label={`Remove ${line.product.name}, ${line.variant.color}, ${line.variant.size}`}
                          onClick={() => remove(line.variantId)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <span className="bag-line-total">
                      {format(unitPrice(line.variant) * line.quantity)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="bag-note" role="status">
              {storageAvailable
                ? "Your selection is saved on this browser. Items in your bag are not reserved."
                : "Your selection is available for this visit. Browser storage is unavailable."}
            </p>
          </div>
          <aside className="order-summary">
            <p className="eyebrow">YOUR PREVIEW</p>
            <h2>Order summary</h2>
            <div className="summary-line">
              <span>
                Subtotal ({count} {count === 1 ? "item" : "items"})
              </span>
              <strong>{format(subtotal(lines))}</strong>
            </div>
            <div className="summary-line muted">
              <span>Delivery</span>
              <span>Free shipping within Vietnam</span>
            </div>
            <div className="summary-line muted">
              <span>Taxes & fees</span>
              <span>Included in product prices</span>
            </div>
            <p className="summary-notice">
              {currency === "USD" && "USD amounts are estimates converted from VND. "}
              {canOrder ? "WONS will contact you to confirm your order and arrange payment." : "Your bag includes items that are not available to order. You can still preview checkout."}
            </p>
            <Link href="/checkout" className="button dark">
              Continue to checkout <Arrow />
            </Link>
            <p className="secure-note">{canOrder ? "No payment is collected at checkout." : "Preview items cannot be ordered."}</p>
          </aside>
        </div>
      )}
    </section>
  );
}
