export type ActivityEntry = {
  id: number;
  actor_email: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
  product?: { id: string; name: string } | null;
};
export const ACTIVITY_PAGE_SIZE = 25;
export const activityTypes = [
  { value: "all", label: "All areas" },
  { value: "products", label: "Products & visibility" },
  { value: "variants", label: "Prices, variants & availability" },
  { value: "product_images", label: "Product images" },
  { value: "staff_members", label: "Team & permissions" },
];
export function parseActivityQuery(params: URLSearchParams) {
  const type = params.get("type") ?? "all";
  const action = params.get("action") ?? "all";
  const cursor = params.get("cursor");
  if (!activityTypes.some(item => item.value === type)) throw Error("Choose a valid activity area.");
  if (!["all", "INSERT", "UPDATE", "DELETE"].includes(action)) throw Error("Choose a valid activity action.");
  if (cursor !== null && (!/^[1-9][0-9]{0,18}$/.test(cursor) || BigInt(cursor) > BigInt("9223372036854775807"))) {
    throw Error("Invalid activity page. Return to the newest activity.");
  }
  return { type, action, cursor };
}
export const activityFieldLabels: Record<string, string> = {
  name: "Product name", slug: "Product URL", description: "Description",
  department: "Department", category: "Category", status: "Website visibility",
  price_vnd: "Regular price", sale_price_vnd: "Sale price",
  available_quantity: "Available quantity", sku: "SKU", color: "Colour",
  color_hex: "Colour code", size: "Size", alt: "Image description",
  display_name: "Name", email: "Email", role: "Role", active: "Access enabled",
  is_demo: "Demo product", sort_order: "Display order",
  framing: "Image framing",
};
export function activityChanges(entry: ActivityEntry) {
  return [...new Set([...Object.keys(entry.before_data ?? {}), ...Object.keys(entry.after_data ?? {})])]
    .filter(key => !["id", "product_id", "version", "created_at", "updated_at", "storage_path"].includes(key)
      && JSON.stringify(entry.before_data?.[key]) !== JSON.stringify(entry.after_data?.[key]));
}
function field(entry: ActivityEntry, key: string): string {
  const value = entry.after_data?.[key] ?? entry.before_data?.[key];
  return typeof value === "string" ? value : "";
}
export function activityTitle(entry: ActivityEntry) {
  if (entry.entity_type === "staff_members") return field(entry, "display_name") || field(entry, "email") || "Team member";
  if (entry.entity_type === "products") return field(entry, "name") || entry.product?.name || "Product";
  if (entry.entity_type === "variants") return [entry.product?.name, field(entry, "sku")].filter(Boolean).join(" · ") || "Product variant";
  return entry.product?.name || field(entry, "alt") || "Product image";
}
export function activityAction(entry: ActivityEntry) {
  const changed = activityChanges(entry);
  if (entry.entity_type === "staff_members") {
    if (entry.action === "INSERT") return "Access approved";
    if (changed.includes("active")) return entry.after_data?.active ? "Access enabled" : "Access disabled";
    if (changed.includes("role")) return "Role changed";
    return "Team access updated";
  }
  if (entry.entity_type === "product_images") {
    if (entry.action === "INSERT") return "Image added";
    if (entry.action === "DELETE") return "Image removed";
    if (changed.includes("framing")) return "Image reframed";
    return changed.includes("sort_order") ? "Gallery reordered" : "Image updated";
  }
  if (entry.entity_type === "variants") {
    if (entry.action === "INSERT") return "Variant created";
    if (entry.action === "DELETE") return "Variant removed";
    if (changed.some(key => key === "price_vnd" || key === "sale_price_vnd")) return "Pricing updated";
    return changed.includes("available_quantity") ? "Availability updated" : "Variant updated";
  }
  if (entry.action === "INSERT") return "Product created";
  if (changed.includes("status")) {
    if (entry.after_data?.status === "published") return "Product published";
    if (entry.after_data?.status === "hidden") return "Product hidden";
    return "Visibility updated";
  }
  return changed.length ? "Product updated" : "Product saved";
}
export function activityValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "framing" && typeof value === "object") {
    const frame = value as { x: number; y: number; zoom: number };
    return `Position ${frame.x}% / ${frame.y}% · Zoom ${Math.round(frame.zoom * 100)}%`;
  }
  if ((key === "price_vnd" || key === "sale_price_vnd") && typeof value === "number") {
    return "VND " + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
  }
  if (key === "role") return value === "owner" ? "Owner" : value === "marketing_editor" ? "Marketing Editor" : String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key === "status" && typeof value === "string") return value.charAt(0).toUpperCase() + value.slice(1);
  return String(value);
}
export function activityProductId(entry: ActivityEntry): string | null {
  if (entry.entity_type === "staff_members") return null;
  const value = entry.entity_type === "products" ? entry.entity_id : entry.after_data?.product_id ?? entry.before_data?.product_id;
  return typeof value === "string" ? value : null;
}
