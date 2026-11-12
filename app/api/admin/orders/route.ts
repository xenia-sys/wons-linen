import { adminError, AdminError, adminJson, authorizedStaff } from "../../../../lib/admin-server";
import { ORDER_UUID } from "../../../../lib/orders";

const SUMMARY = "id,order_number,created_at,seen_at,status,item_count,total_vnd";
const LIMIT = 30;
const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  try {
    const { db } = await authorizedStaff(request, true);
    const search = new URL(request.url).searchParams;
    const id = search.get("id");
    if (id !== null) {
      if (!ORDER_UUID.test(id)) throw new AdminError("Invalid order reference.");
      const { data, error } = await db.from("wons_orders")
        .select(`${SUMMARY},email,phone,billing,delivery,notes,lines`).eq("id", id).maybeSingle();
      if (error) throw new AdminError("Could not load the order.", 503);
      if (!data) throw new AdminError("Order not found.", 404);
      return Response.json({ order: data }, { headers });
    }
    if (search.get("count") === "new") {
      const { count, error } = await db.from("wons_orders").select("id", { head: true, count: "exact" }).is("seen_at", null);
      if (error) throw new AdminError("Could not check for new orders.", 503);
      return Response.json({ count }, { headers });
    }
    const before = search.get("before");
    if (before !== null && (!/^\d{1,15}$/.test(before) || Number(before) < 1))
      throw new AdminError("Invalid order cursor.");
    let query = db.from("wons_orders").select(SUMMARY).order("order_number", { ascending: false }).limit(LIMIT + 1);
    if (before) query = query.lt("order_number", Number(before));
    const { data, error } = await query;
    if (error) throw new AdminError("Could not load orders.", 503);
    const orders = data.slice(0, LIMIT);
    return Response.json({ orders, before: data.length > LIMIT ? orders.at(-1)?.order_number : null }, { headers });
  } catch (error) {
    return adminError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { db } = await authorizedStaff(request, true);
    const data = await adminJson(request);
    if (!data || typeof data.id !== "string" || !ORDER_UUID.test(data.id) || !["seen", "confirm", "cancel"].includes(data.action))
      throw new AdminError("Invalid order action.");
    const { data: status, error } = await db.rpc("manage_wons_order", { order_id: data.id, order_action: data.action });
    if (error?.code === "P0002") throw new AdminError("Order not found.", 404);
    if (error?.code === "WN004") throw new AdminError("The order was already updated. Reload the order for its current status.", 409);
    if (error) throw new AdminError("Could not update the order. Please try again.", 503);
    return Response.json({ status }, { headers });
  } catch (error) {
    return adminError(error);
  }
}
