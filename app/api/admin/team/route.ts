import {
  authorizedStaff,
  adminError,
  adminJson,
  AdminError,
  databaseError,
} from "../../../../lib/admin-server";
import { parseStaff } from "../../../../lib/admin-validation";
import { ORDER_UUID } from "../../../../lib/orders";
export async function GET(request: Request) {
  try {
    const { db } = await authorizedStaff(request, true);
    const { data, error } = await db
      .from("staff_members")
      .select("id,email,display_name,role,active,created_at")
      .order("created_at");
    if (error) throw databaseError(error);
    return Response.json(
      { members: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return adminError(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db } = await authorizedStaff(request, true);
    const member = parseStaff(await adminJson(request));
    const { error } = await db
      .from("staff_members")
      .upsert(member, { onConflict: "email" });
    if (error) throw databaseError(error);
    return Response.json(
      { saved: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return adminError(e);
  }
}

export async function DELETE(request: Request) {
  try {
    const { db } = await authorizedStaff(request, true);
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !ORDER_UUID.test(id)) throw new AdminError("Invalid team member.");
    const { data, error } = await db.from("staff_members")
      .delete().eq("id", id).select("id").maybeSingle();
    if (error?.code === "WN005") throw new AdminError("You cannot remove your own admin access.", 409);
    if (error) throw databaseError(error);
    if (!data) throw new AdminError("Team member not found.", 404);
    return Response.json({ removed: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminError(error);
  }
}
