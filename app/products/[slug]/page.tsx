import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog } from "../../../lib/catalog";
import { ProductDetail } from "../../../components/product-detail";
import { ProductCard } from "../../../components/product-card";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getCatalog()).find((p) => p.slug === slug);
  return { title: p?.name ?? "Style not found", description: p?.description };
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
      <ProductDetail key={product.id} product={product} />
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
