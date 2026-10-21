"use client";
import { useState } from "react";
import Link from "next/link";
import type { Product } from "../lib/types";
import { MAX_PER_VARIANT, unitPrice } from "../lib/commerce";
import { ProductPrice } from "./product-price";
import { useBag } from "./cart-provider";
import { ProductGallery } from "./product-gallery";
import { Arrow } from "./icons";
export function ProductDetail({ product }: { product: Product }) {
  const colors = [
    ...new Map(product.variants.map((v) => [v.color, v.color_hex])).entries(),
  ];
  const [color, setColor] = useState(colors[0][0]);
  const [size, setSize] = useState("");
  const [added, setAdded] = useState(false);
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
  const atLimit = variant
    ? inBag >= Math.min(MAX_PER_VARIANT, variant.available_quantity)
    : false;
  const canAdd = ready && variant && variant.available_quantity > 0 && !atLimit;
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
            {product.is_demo
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
                    setAdded(false);
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
                      setAdded(false);
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
          <button
            className="button dark add-button"
            disabled={!canAdd}
            onClick={() => {
              if (variant && canAdd) {
                add(variant.id);
                setAdded(true);
              }
            }}
          >
            {!ready
              ? "Loading your bag…"
              : !size
                ? "Select a size to continue"
                : atLimit
                  ? "Preview quantity limit reached"
                  : variant?.available_quantity === 0
                    ? "Unavailable"
                    : "Add to preview bag"}
            <Arrow />
          </button>
          <div className="added-status" role="status">
            {added && (
              <>
                Added to your bag. <Link href="/bag">View bag →</Link>
              </>
            )}
            {!storageAvailable && (
              <p>
                Your bag is available for this visit; browser storage is
                unavailable.
              </p>
            )}
          </div>
          <p className="detail-disclaimer">
            Try the bag experience. No stock is reserved and no order or payment
            can be placed.
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
