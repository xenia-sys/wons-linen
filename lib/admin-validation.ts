import { parseImageFraming } from "./image-framing.ts";
import type { ImageFraming } from "./image-framing.ts";
export type StaffRole = "owner" | "marketing_editor";
export type AdminVariant = {
  id?: string;
  sku: string;
  color: string;
  color_hex: string;
  size: string;
  price_vnd: number;
  sale_price_vnd: number | null;
  available_quantity: number;
};
export type AdminImage = {
  id?: string;
  storage_path: string;
  alt: string;
  color: string | null;
  framing?: ImageFraming | null;
};
export type ProductDraft = {
  id?: string;
  version?: number;
  name: string;
  slug: string;
  description: string;
  department: "Women" | "Men";
  category: "Shirts" | "Dresses" | "Trousers" | "Sets";
  status: "hidden" | "preview" | "published";
  is_demo: boolean;
  sort_order: number;
  variants: AdminVariant[];
  images: AdminImage[];
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validId(value: unknown): value is string {
  return typeof value === "string" && uuid.test(value);
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid form data.");
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number, required = true) {
  if (typeof value !== "string") throw Error(`${label} is required.`);
  const v = value.trim();
  if ((required && !v) || v.length > max)
    throw Error(
      `${label} must contain ${required ? "1" : "0"}–${max} characters.`,
    );
  return v;
}
function integer(value: unknown, label: string, min = 0) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > 2147483647
  )
    throw Error(`${label} must be a whole number of at least ${min}.`);
  return value;
}
function optionalId(value: unknown) {
  if (value === undefined || value === "") return undefined;
  if (!validId(value)) throw Error("Invalid record identifier.");
  return value;
}
export function parseProductDraft(input: unknown): ProductDraft {
  const p = record(input);
  const id = optionalId(p.id);
  const name = text(p.name, "Product name", 160);
  const slug = text(p.slug, "Product URL", 160);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))
    throw Error(
      "Use lowercase words separated by hyphens for the product URL.",
    );
  if (
    !["Women", "Men"].includes(String(p.department)) ||
    !["Shirts", "Dresses", "Trousers", "Sets"].includes(String(p.category)) ||
    !["hidden", "preview", "published"].includes(String(p.status))
  )
    throw Error("Choose a valid department, category and visibility.");
  if (typeof p.is_demo !== "boolean" || (p.status === "preview" && !p.is_demo))
    throw Error("Only demo products can use Preview status.");
  if (
    !Array.isArray(p.variants) ||
    p.variants.length < 1 ||
    p.variants.length > 100
  )
    throw Error("Add between 1 and 100 variants.");
  const variants = p.variants.map((value) => {
    const v = record(value);
    const price = integer(v.price_vnd, "Regular price", 1);
    const sale =
      v.sale_price_vnd === null ||
      v.sale_price_vnd === "" ||
      v.sale_price_vnd === undefined
        ? null
        : integer(v.sale_price_vnd, "Sale price", 1);
    if (sale !== null && sale >= price)
      throw Error("Sale price must be lower than regular price.");
    const hex = text(v.color_hex, "Colour code", 7);
    if (!/^#[0-9a-f]{6}$/i.test(hex))
      throw Error("Use a six-digit hex colour.");
    const size = text(v.size, "Size", 4);
    if (!["XS", "S", "M", "L", "XL", "XXL"].includes(size))
      throw Error("Choose a valid size.");
    return {
      id: optionalId(v.id),
      sku: text(v.sku, "SKU", 120),
      color: text(v.color, "Colour", 60),
      color_hex: hex,
      size,
      price_vnd: price,
      sale_price_vnd: sale,
      available_quantity: integer(v.available_quantity, "Available quantity"),
    };
  });
  if (
    new Set(variants.map((v) => v.sku)).size !== variants.length ||
    new Set(variants.map((v) => `${v.color}\0${v.size}`)).size !==
      variants.length
  )
    throw Error("Every SKU and colour/size combination must be unique.");
  if (!Array.isArray(p.images) || p.images.length > 20)
    throw Error("Use up to 20 product images.");
  const images = p.images.map((value) => {
    const v = record(value);
    const path = text(v.storage_path, "Image path", 200);
    if (
      !id ||
      !path.startsWith(`${id}/`) ||
      !/^[a-f0-9-]+\/[a-f0-9-]+\.(jpg|png|webp|avif)$/.test(path)
    )
      throw Error("Upload images to this product before saving.");
    return {
      id: optionalId(v.id),
      storage_path: path,
      alt: text(v.alt, "Image description", 300),
      ...(Object.hasOwn(v, "framing") ? { framing: parseImageFraming(v.framing) } : {}),
      color:
        v.color === null || v.color === ""
          ? null
          : text(v.color, "Image colour", 60),
    };
  });
  if (new Set(images.map((i) => i.storage_path)).size !== images.length)
    throw Error("An image can only appear once in the gallery.");
  if (images.some((i) => i.color && !variants.some((v) => v.color === i.color)))
    throw Error("Image colours must match a product variant.");
  if (p.status === "published" && !p.is_demo && !images.length)
    throw Error("Add product photography before publishing.");
  return {
    id,
    version: id ? integer(p.version, "Product version", 1) : undefined,
    name,
    slug,
    description: text(p.description, "Description", 10000, false),
    department: p.department as ProductDraft["department"],
    category: p.category as ProductDraft["category"],
    status: p.status as ProductDraft["status"],
    is_demo: p.is_demo,
    sort_order: integer(p.sort_order ?? 0, "Display order"),
    variants,
    images,
  };
}
export function parseStaff(input: unknown) {
  const p = record(input);
  const email = text(p.email, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw Error("Enter a valid email.");
  if (
    !["owner", "marketing_editor"].includes(String(p.role)) ||
    typeof p.active !== "boolean"
  )
    throw Error("Choose a valid role and account status.");
  return {
    email,
    display_name: text(p.display_name ?? "", "Name", 120, false),
    role: p.role as StaffRole,
    active: p.active,
  };
}
export function imageFileType(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { mime: "image/jpeg", ext: "jpg" };
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v))
    return { mime: "image/png", ext: "png" };
  const s = new TextDecoder().decode(bytes.slice(0, 16));
  if (s.startsWith("RIFF") && s.slice(8, 12) === "WEBP")
    return { mime: "image/webp", ext: "webp" };
  if (s.slice(4, 8) === "ftyp" && ["avif", "avis"].includes(s.slice(8, 12)))
    return { mime: "image/avif", ext: "avif" };
  return null;
}
