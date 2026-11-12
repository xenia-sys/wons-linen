import { validId } from "./admin-validation.ts";

export const DISCOUNT_EVENT_PATH = "/admin/discount-events";
export const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";
export type DiscountEvent = {
  id: string;
  name: string;
  percent_off: number;
  starts_at: string;
  ends_at: string;
  enabled: boolean;
  product_ids: string[];
};

export function vietnamDateTime(iso: string) {
  const local = new Date(Date.parse(iso) + 7 * 3600000);
  return local.toISOString().slice(0, 16);
}

function parseVietnamDateTime(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw Error("Enter a start and end time in Vietnam time.");
  const date = new Date(value + ":00+07:00");
  if (!Number.isFinite(date.getTime()) || vietnamDateTime(date.toISOString()) !== value)
    throw Error("Choose a valid date and time.");
  return date.toISOString();
}

export function parseDiscountEvent(value: unknown): Omit<DiscountEvent, "id"> & { id?: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Invalid event.");
  const draft = value as Record<string, unknown>;
  const name = typeof draft.name === "string" ? draft.name.trim() : "";
  if (!name || name.length > 100) throw Error("Enter an event name of up to 100 characters.");
  const percent = draft.percent_off;
  if (typeof percent !== "number" || !Number.isInteger(percent) || percent < 1 || percent > 99)
    throw Error("Enter a whole discount percentage from 1 to 99.");
  const starts_at = parseVietnamDateTime(draft.starts_at);
  const ends_at = parseVietnamDateTime(draft.ends_at);
  if (ends_at <= starts_at) throw Error("The end time must be after the start time.");
  if (typeof draft.enabled !== "boolean") throw Error("Choose whether the event is enabled.");
  if (!Array.isArray(draft.product_ids) || draft.product_ids.length < 1 ||
    draft.product_ids.length > 1000 || !draft.product_ids.every(validId))
    throw Error("Choose between 1 and 1,000 products.");
  const product_ids = [...new Set(draft.product_ids.map(id => id.toLowerCase()))].sort();
  if (draft.id !== undefined && !validId(draft.id)) throw Error("Invalid discount event.");
  return { id: draft.id, name, percent_off: percent, starts_at, ends_at, enabled: draft.enabled, product_ids };
}

export function discountEventStatus(event: DiscountEvent, now: number) {
  if (!event.enabled) return "Paused";
  if (now < Date.parse(event.starts_at)) return "Scheduled";
  if (now >= Date.parse(event.ends_at)) return "Ended";
  return "Active";
}
