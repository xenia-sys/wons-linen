"use client";
import Link from "next/link";
import Image from "next/image";
import { useBag } from "./cart-provider";
import { MAX_PER_VARIANT, money, subtotal, unitPrice } from "../lib/commerce";
import { GarmentArt } from "./garment-art";
import { Arrow } from "./icons";
export function Bag() {
  const { lines, ready, count, storageAvailable, update, remove } = useBag();
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
                      <p>{money(unitPrice(line.variant))}</p>
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
                      {money(unitPrice(line.variant) * line.quantity)}
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
              <strong>{money(subtotal(lines))}</strong>
            </div>
            <div className="summary-line muted">
              <span>Delivery</span>
              <span>To be confirmed</span>
            </div>
            <div className="summary-line muted">
              <span>Taxes & fees</span>
              <span>To be confirmed</span>
            </div>
            <p className="summary-notice">
              The first edit is a preview. Sample prices are shown; the final
              order total and payment options are not available yet.
            </p>
            <Link href="/checkout" className="button dark">
              Checkout information <Arrow />
            </Link>
            <p className="secure-note">Orders and payments are not open.</p>
          </aside>
        </div>
      )}
    </section>
  );
}
