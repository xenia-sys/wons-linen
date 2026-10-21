import {
  authorizedStaff,
  adminError,
  databaseError,
} from "../../../../lib/admin-server";
export async function GET(request: Request) {
  try {
    const { db } = await authorizedStaff(request, true);
    const { data, error } = await db
      .from("activity_log")
      .select(
        "id,actor_id,actor_email,entity_type,entity_id,action,before_data,after_data,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw databaseError(error);
    return Response.json(
      { activity: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return adminError(e);
  }
}
