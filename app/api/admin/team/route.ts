import {
  authorizedStaff,
  adminError,
  adminJson,
  databaseError,
} from "../../../../lib/admin-server";
import { parseStaff } from "../../../../lib/admin-validation";
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
