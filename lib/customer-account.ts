export type AddressKind = "shipping" | "billing";

export const addressFields = [
  { name: "recipient", label: "Full name", max: 100, required: true, auto: "name" },
  { name: "line1", label: "Address line 1", max: 180, required: true, auto: "address-line1" },
  { name: "line2", label: "Address line 2", max: 180, required: false, auto: "address-line2" },
  { name: "city", label: "City", max: 100, required: true, auto: "address-level2" },
  { name: "region", label: "State or province", max: 100, required: false, auto: "address-level1" },
  { name: "postal_code", label: "Postal code", max: 24, required: false, auto: "postal-code" },
  { name: "country", label: "Country", max: 100, required: true, auto: "country-name" },
] as const;

type AddressField = (typeof addressFields)[number]["name"];
export type Address = Record<AddressField, string> & { kind: AddressKind };

export type OrderSummary = {
  id: string;
  order_number: string;
  placed_at: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | "refunded";
  total_vnd: number;
};

export function parseUsername(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length >= 2 && name.length <= 60 && !/[\u0000-\u001f\u007f]/.test(name)
    ? name : null;
}

export function parseAddress(kind: AddressKind, form: FormData): Address | null {
  const values = {} as Record<AddressField, string>;
  for (const field of addressFields) {
    const value = form.get(field.name);
    if (typeof value !== "string") return null;
    const text = value.trim();
    if ((field.required && !text) || text.length > field.max) return null;
    values[field.name] = text;
  }
  return { kind, ...values };
}
