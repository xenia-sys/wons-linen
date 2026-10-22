import type { ImageFraming } from "./image-framing.ts";
export type Department = "Women" | "Men";
export type Category = "Shirts" | "Dresses" | "Trousers" | "Sets";
export type Variant = {
  id: string;
  sku: string;
  color: string;
  color_hex: string;
  size: string;
  price_vnd: number;
  sale_price_vnd?: number | null;
  available_quantity: number;
};
export type ProductImage = {
  id: string;
  src: string;
  alt: string;
  /** Omit for an image shared by every colour. */
  color?: string;
  framing?: ImageFraming | null;
};
export type Product = {
  id: string;
  slug: string;
  name: string;
  department: Department;
  category: Category;
  description: string;
  status: "preview" | "published";
  is_demo: boolean;
  sort_order: number;
  variants: Variant[];
  images?: ProductImage[];
};
export type CartLine = { variantId: string; quantity: number };
export type ResolvedLine = CartLine & { product: Product; variant: Variant };
