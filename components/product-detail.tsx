"use client";
import { useState } from "react";
import Link from "next/link";
import type { Product } from "../lib/types";
import { remainingVariantQuantity, unitPrice } from "../lib/commerce";
import { ProductPrice } from "./product-price";
import { useBag } from "./cart-provider";
import { ProductGallery } from "./product-gallery";
import { Arrow } from "./icons";
export function ProductDetail({ product, canOrder }: { product: Product; canOrder: boolean }) {
  const colors = [
    ...new Map(product.variants.map((v) => [v.color, v.color_hex])).entries(),
  ];
  const [color, setColor] = useState(colors[0][0]);
  const [size, setSize] = useState("");
  const [quantityInput, setQuantityInput] = useState("1");
  const [added, setAdded] = useState(0);
  const [addError, setAddError] = useState(false);
  const { lines, add, ready, storageAvailable } = useBag();
  const variant = product.variants.find(
    (v) => v.color === color && v.size === size,
  );
  const displayedVariant =
    variant ??
    [...product.variants.filter((v) => v.color === color)].sort(
      (a, b) => unitPrice(a) - unitPrice(b),
    )[0];
  const sizes = [...new Set(product.variants.map((v) => v.size))];
  const inBag =
    lines.find((line) => line.variantId === variant?.id)?.quantity ?? 0;
  const maxQuantity = variant ? remainingVariantQuantity(variant.available_quantity, inBag) : 0;
  const quantity = /^\d+$/.test(quantityInput) ? Number(quantityInput) : 0;
  const quantityEnabled = ready && maxQuantity > 0;
  const validQuantity = Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= maxQuantity;
  const atLimit = variant && variant.available_quantity > 0 && maxQuantity === 0;
  const canAdd = quantityEnabled && validQuantity;
  function selectQuantity(value: string) {
    setQuantityInput(value);
    setAdded(0);
    setAddError(false);
  }
  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/shop">Collection</Link>
        <span>/</span>
        <Link href={product.department === "Men" ? "/men" : "/women"}>
          {product.department}
        </Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>
      <section className="product-detail">
        <ProductGallery
          key={`${product.id}:${color}`}
          product={product}
          color={color}
          colorHex={colors.find((c) => c[0] === color)?.[1] ?? "#eee7d7"}
        />
        <div className="product-info">
          <p className="eyebrow">
            {product.department.toUpperCase()} /{" "}
            {product.category.toUpperCase()}
          </p>
          <h1>{product.name}</h1>
          <p className="detail-price">
            <ProductPrice variant={displayedVariant} />
          </p>
          <p className="product-description">{product.description}</p>
          <span className="preview-pill">
            {canOrder ? "Free shipping within Vietnam" : product.is_demo
              ? "Collection preview · Sample price"
              : "Collection preview · Orders are not open"}
          </span>
          <fieldset>
            <legend>
              Colour <span>— {color}</span>
            </legend>
            <div className="color-options">
              {colors.map(([c, hex]) => (
                <button
                  key={c}
                  aria-pressed={c === color}
                  onClick={() => {
                    setColor(c);
                    selectQuantity("1");
                    if (
                      !product.variants.some(
                        (v) =>
                          v.color === c &&
                          v.size === size &&
                          v.available_quantity > 0,
                      )
                    )
                      setSize("");
                  }}
                >
                  <span className="swatch" style={{ backgroundColor: hex }} />
                  {c}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>
              Select your size <span>— Required</span>
            </legend>
            <div className="size-options">
              {sizes.map((s) => {
                const available = product.variants.some(
                  (v) =>
                    v.color === color &&
                    v.size === s &&
                    v.available_quantity > 0,
                );
                return (
                  <button
                    key={s}
                    disabled={!available}
                    aria-pressed={s === size}
                    aria-label={`${s}${available ? "" : ", unavailable"}`}
                    onClick={() => {
                      setSize(s);
                      selectQuantity("1");
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <details className="size-guide">
            <summary>
              Size & fit guide <span>+</span>
            </summary>
            <p>
              This is a silhouette preview. Confirmed garment measurements and
              fit notes will be added for each style before orders open. Please
              do not use the preview sizes as a fitting guide.
            </p>
          </details>
          <form className="product-purchase" onSubmit={event => {
            event.preventDefault();
            if (!variant || !canAdd) return;
            const addedCount = add(variant.id, quantity);
            setAdded(addedCount);
            setAddError(addedCount === 0);
            if (addedCount > 0) setQuantityInput("1");
          }}>
            <label className="product-quantity-label" htmlFor="product-quantity">Quantity</label>
            <div className="product-purchase-row">
              <div className="quantity-control product-quantity">
                <button type="button" aria-label="Decrease quantity" disabled={!quantityEnabled || quantity <= 1}
                  onClick={() => selectQuantity(String(Math.max(1, Math.min(maxQuantity, quantity - 1))))}>−</button>
                <input id="product-quantity" type="text" inputMode="numeric" autoComplete="off" maxLength={4} value={quantityInput}
                  disabled={!quantityEnabled} aria-describedby="product-quantity-help"
                  aria-invalid={quantityEnabled && !validQuantity ? true : undefined} onChange={event => selectQuantity(event.target.value)} />
                <button type="button" aria-label="Increase quantity" disabled={!quantityEnabled || quantity >= maxQuantity}
                  onClick={() => selectQuantity(String(Math.min(maxQuantity, quantity + 1)))}>+</button>
              </div>
              <button type="submit" className="button dark add-button" disabled={!canAdd}>
                {!ready ? "Loading your bag…" : !variant ? "Select a size" : atLimit ? "Quantity limit reached"
                  : !maxQuantity ? "Unavailable" : canOrder ? "Add to bag" : "Add to preview bag"}
                <Arrow />
              </button>
            </div>
            <p className="product-quantity-help" id="product-quantity-help">
              {quantityEnabled && !validQuantity ? `Enter a whole number from 1 to ${maxQuantity}.`
                : quantityEnabled ? `You can add up to ${maxQuantity} ${maxQuantity === 1 ? "item" : "items"}.` : "Choose an available colour and size."}
            </p>
          </form>
          <div className="added-status" role="status">
            {added > 0 && (
              <>
                {added} {added === 1 ? "item" : "items"} added to your bag. <Link href="/bag">View bag →</Link>
              </>
            )}
            {addError && <p>Stock has changed. Refresh the page and try again.</p>}
            {!storageAvailable && (
              <p>
                Your bag is available for this visit; browser storage is
                unavailable.
              </p>
            )}
          </div>
          <p className="detail-disclaimer">
            {canOrder ? "Items are reserved when you place an order. WONS will contact you to confirm." : "Try the bag experience. This item is not available to order."}
          </p>
          <div className="product-accordions">
            <details>
              <summary>
                Fabric & care <span>+</span>
              </summary>
              <p>
                Fabric composition, weight, opacity and care instructions will
                be confirmed with the final collection. The illustration shows a
                design concept.
              </p>
            </details>
            <details>
              <summary>
                Delivery & returns <span>+</span>
              </summary>
              <p>
                Delivery areas, shipping fees and return terms are being
                prepared. They will be available to review before purchases
                open.
              </p>
            </details>
          </div>
        </div>
      </section>
    </>
  );
}
