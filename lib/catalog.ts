import { cache } from "react";
import { createPublicSupabaseClient } from "./supabase";
import type { Product } from "./types";
import productImages from "../content/product-images.json";
export const getCatalog = cache(async (): Promise<Product[]> => {
  const { data, error } = await createPublicSupabaseClient()
    .from("products")
    .select(
      "id,slug,name,department,category,description,status,is_demo,sort_order,variants(id,sku,color,color_hex,size,price_vnd,sale_price_vnd,available_quantity),product_images(id,storage_path,alt,color,sort_order,framing)",
    )
    .in("status", ["preview", "published"])
    .order("sort_order")
    .abortSignal(AbortSignal.timeout(8000));
  if (error)
    throw new Error(
      "The WONS collection could not be loaded. Please try again shortly.",
    );
  return (
    data as unknown as (Product & {
      product_images: {
        id: string;
        storage_path: string;
        alt: string;
        color: string | null;
        sort_order: number;
        framing: NonNullable<Product["images"]>[number]["framing"];
      }[];
    })[]
  )
    .filter((p) => p.variants.length > 0)
    .map(({ product_images, ...p }) => ({
      ...p,
      images: product_images.length
        ? [...product_images]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((i) => ({
              id: i.id,
              src: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${i.storage_path}`,
              alt: i.alt,
              color: i.color ?? undefined,
              framing: i.framing,
            }))
        : (productImages[p.slug as keyof typeof productImages] ?? []),
      variants: [...p.variants].sort(
        (a, b) =>
          a.color.localeCompare(b.color) ||
          ["XS", "S", "M", "L", "XL", "XXL"].indexOf(a.size) -
            ["XS", "S", "M", "L", "XL", "XXL"].indexOf(b.size),
      ),
    }));
});
