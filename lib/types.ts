export type Department = "Women" | "Men";
export type Category = "Shirts" | "Dresses" | "Trousers" | "Sets";
export type Variant = {
  id: string;
  sku: string;
  color: string;
  color_hex: string;
  size: string;
  price_vnd: number;
  available_quantity: number;
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
};
export type CartLine = { variantId: string; quantity: number };
export type ResolvedLine = CartLine & { product: Product; variant: Variant };
