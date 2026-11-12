import type { Metadata } from "next";
import { Catalog } from "../../components/catalog";
import { getCatalog } from "../../lib/catalog";
import { selectNewArrivals } from "../../lib/new-arrivals";

export const metadata: Metadata = {
  title: "New Arrivals",
  description: "Discover the latest Women’s and Men’s linen styles from WONS.",
};

export default async function NewArrivalsPage() {
  const { products, preview } = selectNewArrivals(await getCatalog());
  return (
    <>
      <section className="collection-header" aria-labelledby="new-arrivals-title">
        <p className="eyebrow">WONS LINEN / THE LATEST EDIT</p>
        <h1 id="new-arrivals-title">New Arrivals</h1>
        <p>Discover the latest Women’s and Men’s linen styles.</p>
      </section>
      <Catalog products={products} collection="new-arrivals" preview={preview} />
    </>
  );
}
