import type { Address } from "./customer-account.ts";
import { ORDER_COUNTRY, type OrderAddress } from "./orders.ts";

function fromSavedAddress(entry: Address | undefined): OrderAddress | undefined {
  if (!entry) return;
  const country = entry.country.normalize("NFD").replace(/[\u0300-\u036f\s]/g, "").toLowerCase();
  if (country !== "vietnam" && country !== "vn") return;

  // The saved recipient is one field. Preserve its displayed word order.
  const parts = entry.recipient.trim().split(/\s+/);
  const last = parts.length > 1 ? parts.pop() ?? "" : "";
  const fit = (value: string, max: number) => value.length <= max ? value : "";
  return {
    firstName: fit(parts.join(" "), 80), lastName: fit(last, 80),
    street: fit(entry.line1, 160), unit: fit(entry.line2, 160), city: entry.city,
    province: entry.region, postcode: fit(entry.postal_code, 20), country: ORDER_COUNTRY,
  };
}

export function checkoutAddresses(saved: Address[]) {
  const billing = fromSavedAddress(saved.find(a => a.kind === "billing"));
  const shipping = fromSavedAddress(saved.find(a => a.kind === "shipping"));
  return {
    billing: billing ?? shipping,
    shipping: shipping ?? billing,
    separate: Boolean(billing && shipping && JSON.stringify(billing) !== JSON.stringify(shipping)),
  };
}
