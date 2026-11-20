import Link from "next/link";
import Image from "next/image";
import { unitPrice } from "../lib/commerce";
import { ProductPrice } from "./product-price";
import type { Product } from "../lib/types";
import { GarmentArt } from "./garment-art";
import { Arrow } from "./icons";
import { imageFramingStyle } from "../lib/image-framing";
import { isFreeSizeProduct } from "../lib/product-sizes";
import { cardHoverImage } from "../lib/product-gallery";
export function ProductCard({ product }: { product: Product }) {
  const lowest = [...product.variants].sort(
    (a, b) => unitPrice(a) - unitPrice(b),
  )[0];
  const cover = product.images?.[0];
  const hover = cardHoverImage(product);
  const colors = [
    ...new Map(product.variants.map((v) => [v.color, v.color_hex])).entries(),
  ];
  return (
    <article className="product-card">
      <Link href={`/products/${product.slug}`} className="product-card-link">
        <div className={`product-art art-${product.category.toLowerCase()}`} style={cover?.framing ? { aspectRatio: "4 / 5" } : undefined}>
          {cover ? (
            <span className="product-photos">
              <Image
                src={cover.src}
                alt=""
                fill
                sizes="(max-width: 700px) 50vw, 33vw"
                className="product-photo"
                style={imageFramingStyle(cover.framing)}
              />
              {hover && (
                <Image
                  src={hover.src}
                  alt=""
                  fill
                  sizes="(max-width: 700px) 50vw, 33vw"
                  className="product-photo product-photo-hover"
                  loading="lazy"
                  style={imageFramingStyle(hover.framing)}
                />
              )}
            </span>
          ) : (
            <GarmentArt
              category={product.category}
              color={colors[product.sort_order % colors.length]?.[1]}
            />
          )}
          {!cover && <span className="art-bottom">ILLUSTRATED STUDY</span>}
          <span className="product-arrow">
            <Arrow diagonal />
          </span>
        </div>
        <div className="product-title-row">
          <h3>{product.name}</h3>
        </div>
        <p className="product-price">
          <ProductPrice variant={lowest} />
        </p>
        {isFreeSizeProduct(product.variants) && <p className="product-size-label">Free size</p>}
        <div className="product-colors">
          {colors.map(([color, hex]) => (
            <span
              key={color}
              className="mini-swatch"
              style={{ backgroundColor: hex }}
              aria-hidden="true"
            />
          ))}
          <span>{colors.map(([color]) => color).join(" / ")}</span>
        </div>
      </Link>
    </article>
  );
}
