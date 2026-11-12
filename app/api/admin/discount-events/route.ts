import { AdminError, adminError, adminJson, authorizedStaff, databaseError } from "../../../../lib/admin-server";
import { parseDiscountEvent } from "../../../../lib/discount-events";

const headers = { "Cache-Control": "private, no-store" };
const eventFields = "id,name,percent_off,starts_at,ends_at,enabled,product_ids";

export async function GET(request: Request) {
  try {
    const { db } = await authorizedStaff(request);
    const [events, products] = await Promise.all([
      db.from("discount_events").select(eventFields).order("starts_at", { ascending: false }),
      db.from("products").select("id,name,department,status,variants(price_vnd)").order("name"),
    ]);
    if (events.error || products.error) throw new AdminError("Discount events could not be loaded. Please try again.", 503);
    return Response.json({
      events: events.data,
      products: products.data.map(({ variants, ...product }) => ({
        ...product, price_vnd: variants.length ? Math.min(...variants.map(variant => variant.price_vnd)) : null,
      })),
    }, { headers });
  } catch (error) {
    return adminError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { db } = await authorizedStaff(request);
    const { id, ...event } = parseDiscountEvent(await adminJson(request));
    const table = db.from("discount_events");
    const query = id ? table.update(event).eq("id", id) : table.insert(event);
    const { data, error } = await query.select(eventFields).maybeSingle();
    if (error?.code === "23514") throw new AdminError("Check the event dates, discount and selected products.");
    if (error) throw databaseError(error);
    if (!data) throw new AdminError("Discount event not found.", 404);
    return Response.json({ event: data }, { headers });
  } catch (error) {
    return adminError(error);
  }
}
