import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog } from "../../../lib/catalog";
import { ProductDetail } from "../../../components/product-detail";
import { ProductCard } from "../../../components/product-card";
import { checkoutGatewaySecret } from "../../../lib/checkout-config";
import { shareImage } from "../../../lib/product-gallery";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getCatalog()).find((p) => p.slug === slug);
  if (!p) return { title: "Style not found" };
  const url = `/products/${p.slug}`;
  const photo = shareImage(p);
  const images = photo ? [{ url: photo.src, alt: photo.alt }] : undefined;
  return {
    title: p.name,
    description: p.description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "WONS LINEN", locale: "en_US", url, title: `${p.name} | WONS LINEN`, description: p.description, images },
    twitter: { card: "summary_large_image", images },
  };
}
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const products = await getCatalog();
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();
  const related = products.filter(
    (p) => p.id !== product.id && p.department === product.department,
  );
  return (
    <>
      <ProductDetail key={product.id} product={product} canOrder={Boolean(checkoutGatewaySecret()) && product.status === "published" && !product.is_demo} />
      <section className="related section-space">
        <div className="section-heading">
          <h2>A little more to love.</h2>
          <Link
            className="underlined-link"
            href={product.department === "Men" ? "/men" : "/women"}
          >
            Explore {product.department}
          </Link>
        </div>
        <div className="product-grid">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </>
  );
}
