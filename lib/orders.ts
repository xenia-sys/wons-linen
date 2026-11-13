import { MAX_PER_VARIANT } from "./commerce.ts";

export const ORDER_COUNTRY = "Vietnam";
export const COD_LABEL = "Cash on delivery (COD)";
export const ORDER_MAX_ITEMS = 30;
export const ORDER_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type OrderAddress = {
  firstName: string;
  lastName: string;
  street: string;
  unit: string;
  city: string;
  province: string;
  postcode: string;
  country: typeof ORDER_COUNTRY;
};
export type OrderDetails = {
  email: string;
  phone: string;
  billing: OrderAddress;
  delivery: OrderAddress;
  notes: string;
};
export type OrderItem = { variantId: string; quantity: number; price: number };
export type OrderReceipt = { order_number: number; total_vnd: number };
export const ORDER_FLOW = ["pending", "confirmed", "packed", "shipped", "delivered", "completed"] as const;
export type OrderStatus = (typeof ORDER_FLOW)[number] | "cancelled";
export const ORDER_ACTIONS = ["seen", "confirm", "pack", "ship", "deliver", "complete", "cancel"] as const;
export type OrderAction = (typeof ORDER_ACTIONS)[number];
export type OrderSummary = OrderReceipt & {
  id: string;
  created_at: string;
  seen_at: string | null;
  status: OrderStatus;
  item_count: number;
  payment_method: "cod";
  is_test: boolean;
};
export type StoredOrder = OrderSummary & {
  email: string;
  phone: string;
  billing: OrderAddress;
  delivery: OrderAddress;
  notes: string;
  lines: (OrderItem & { name: string; sku: string; color: string; size: string })[];
};

export function orderReference(number: number) {
  return `WONS-${String(number).padStart(6, "0")}`;
}

export function addressLines(address: OrderAddress) {
  return [
    [address.firstName, address.lastName].filter(Boolean).join(" "),
    address.street,
    address.unit,
    [address.city, address.province, address.postcode].filter(Boolean).join(", "),
    address.country,
  ].filter(Boolean);
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Check your order details and try again.");
  return value as Record<string, unknown>;
}

function field(value: unknown, label: string, max: number, required = true) {
  if (value == null && !required) return "";
  if (typeof value !== "string" || value.length > max || (required && !value.trim()))
    throw new Error(`Check the ${label} field.`);
  return value.trim();
}

function parseAddress(value: unknown): OrderAddress {
  const address = record(value);
  if (address.country != null && address.country !== ORDER_COUNTRY)
    throw new Error("WONS only delivers within Vietnam.");
  return {
    firstName: field(address.firstName, "first name", 80),
    lastName: field(address.lastName, "last name", 80),
    street: field(address.street, "street address", 160),
    unit: field(address.unit, "apartment", 160, false),
    city: field(address.city, "town or city", 100),
    province: field(address.province, "province", 100, false),
    postcode: field(address.postcode, "postal code", 20, false),
    country: ORDER_COUNTRY,
  };
}

export function parseOrder(value: unknown) {
  const body = record(value);
  const id = field(body.id, "order reference", 36).toLowerCase();
  if (!ORDER_UUID.test(id)) throw new Error("The order reference is invalid.");
  const email = field(body.email, "email address", 160).toLowerCase();
  const phone = field(body.phone, "phone number", 40).replace(/[\s().-]/g, "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  if (!/^\+?[0-9]{8,15}$/.test(phone))
    throw new Error("Enter a valid phone number.");
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > ORDER_MAX_ITEMS)
    throw new Error("Your bag must contain between 1 and 30 items.");
  const seen = new Set<string>();
  const items: OrderItem[] = body.items.map((value: unknown) => {
    const item = record(value);
    const variantId = field(item.variantId, "product selection", 36).toLowerCase();
    const { quantity, price } = item;
    if (!ORDER_UUID.test(variantId) || seen.has(variantId) ||
      typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_PER_VARIANT ||
      typeof price !== "number" || !Number.isSafeInteger(price) || price < 1 || price > 2147483647)
      throw new Error("A product or quantity in your bag is invalid.");
    seen.add(variantId);
    return { variantId, quantity, price };
  }).sort((a, b) => a.variantId.localeCompare(b.variantId));
  if (items.reduce((n, line) => n + line.quantity, 0) > ORDER_MAX_ITEMS)
    throw new Error("You can order up to 30 items at a time.");
  return {
    id, items, email, phone,
    billing: parseAddress(body.billing), delivery: parseAddress(body.delivery),
    notes: field(body.notes, "order notes", 500, false),
  };
}
