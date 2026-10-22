import { authorizedStaff, adminError, AdminError } from "../../../../lib/admin-server";
import { ACTIVITY_PAGE_SIZE, parseActivityQuery, activityProductId } from "../../../../lib/admin-activity";
import type { ActivityEntry } from "../../../../lib/admin-activity";
export async function GET(request: Request) {
  try {
    const { db } = await authorizedStaff(request, true);
    const filters = parseActivityQuery(new URL(request.url).searchParams);
    let query = db.from("activity_log")
      .select("id,actor_email,entity_type,entity_id,action,before_data,after_data,created_at")
      .order("id", { ascending: false }).limit(ACTIVITY_PAGE_SIZE + 1);
    if (filters.type !== "all") query = query.eq("entity_type", filters.type);
    if (filters.action !== "all") query = query.eq("action", filters.action);
    if (filters.cursor) query = query.lt("id", filters.cursor);
    const { data, error } = await query;
    if (error) throw new AdminError("Activity history could not be loaded. Please try again.", 503);
    const rows = (data ?? []) as ActivityEntry[];
    const activity = rows.slice(0, ACTIVITY_PAGE_SIZE);
    const ids = [...new Set(activity.map(activityProductId).filter((id): id is string => !!id))];
    const names = new Map<string, { id: string; name: string }>();
    if (ids.length) {
      const { data: products } = await db.from("products").select("id,name").in("id", ids);
      for (const product of products ?? []) names.set(product.id, product);
    }
    return Response.json({
      activity: activity.map(entry => ({ ...entry, product: names.get(activityProductId(entry) ?? "") ?? null })),
      nextCursor: rows.length > ACTIVITY_PAGE_SIZE ? String(activity[activity.length - 1].id) : null,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return adminError(error);
  }
}
