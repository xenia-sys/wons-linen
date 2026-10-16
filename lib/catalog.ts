import { cache } from "react";
import { createPublicSupabaseClient } from "./supabase";
import type { Product } from "./types";
export const getCatalog = cache(async (): Promise<Product[]> => {
  const { data, error } = await createPublicSupabaseClient()
    .from("products")
    .select(
      "id,slug,name,department,category,description,status,is_demo,sort_order,variants(id,sku,color,color_hex,size,price_vnd,available_quantity)",
    )
    .in("status", ["preview", "published"])
    .order("sort_order")
    .abortSignal(AbortSignal.timeout(8000));
  if (error)
    throw new Error(
      "The WONS collection could not be loaded. Please try again shortly.",
    );
  return (data as Product[])
    .filter((p) => p.variants.length > 0)
    .map((p) => ({
      ...p,
      variants: [...p.variants].sort(
        (a, b) =>
          a.color.localeCompare(b.color) ||
          ["XS", "S", "M", "L", "XL", "XXL"].indexOf(a.size) -
            ["XS", "S", "M", "L", "XL", "XXL"].indexOf(b.size),
      ),
    }));
});
