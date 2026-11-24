import type { MetadataRoute } from "next";
import { getCatalog } from "../lib/catalog";
import policies from "../content/store-policies.json";
import { informationPages } from "../lib/information-pages";

const site = "https://www.wonslinen.vn";

// Rebuilt at most hourly so newly published products appear without a deploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getCatalog();
  const pages = ["", "/women", "/men", "/shop", "/new-arrivals"].map((path) => ({
    url: `${site}${path || "/"}`,
    changeFrequency: "weekly" as const,
    priority: path ? 0.8 : 1,
  }));
  const information = [...Object.keys(informationPages), ...Object.keys(policies)].map((slug) => ({
    url: `${site}/information/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.3,
  }));
  const styles = products.map((product) => ({
    url: `${site}/products/${product.slug}`,
    lastModified: product.created_at ? new Date(product.created_at) : undefined,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
  return [...pages, ...styles, ...information];
}
