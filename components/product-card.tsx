import Link from "next/link";
import Image from "next/image";
import { unitPrice } from "../lib/commerce";
import { ProductPrice } from "./product-price";
import type { Product } from "../lib/types";
import { GarmentArt } from "./garment-art";
import { Arrow } from "./icons";
export function ProductCard({ product }: { product: Product }) {
  const lowest = [...product.variants].sort(
    (a, b) => unitPrice(a) - unitPrice(b),
  )[0];
  const cover = product.images?.[0];
  const colors = [
    ...new Map(product.variants.map((v) => [v.color, v.color_hex])).entries(),
  ];
  return (
    <article className="product-card">
      <Link href={`/products/${product.slug}`} className="product-card-link">
        <div className={`product-art art-${product.category.toLowerCase()}`}>
          <span className="art-label">
            {product.department} / {product.category}
          </span>
          {cover ? (
            <Image
              src={cover.src}
              alt=""
              fill
              sizes="(max-width: 700px) 50vw, 33vw"
              style={{ objectFit: "cover" }}
            />
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
