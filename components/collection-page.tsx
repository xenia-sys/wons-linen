import { getCatalog } from "../lib/catalog";
import { Catalog } from "./catalog";
export async function CollectionPage({
  department = "All",
}: {
  department?: "All" | "Women" | "Men";
}) {
  const products = await getCatalog();
  return (
    <>
      <section className="collection-header">
        <p className="eyebrow">WONS LINEN / THE FIRST EDIT</p>
        <h1>
          {department === "All"
            ? "The whole collection."
            : department === "Men"
              ? "Ease, in every detail."
              : "Softness, in your own way."}
        </h1>
        <p>
          {department === "All"
            ? "An invitation to slow down. Discover the Women’s and Men’s linen edit."
            : `A first look at the ${department.toLowerCase()}’s collection. Simple lines, room to breathe.`}
        </p>
      </section>
      <Catalog key={department} products={products} department={department} />
    </>
  );
}
