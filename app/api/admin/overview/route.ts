import { adminError, AdminError, authorizedStaff } from "../../../../lib/admin-server";
import { parseOverviewPeriod } from "../../../../lib/admin-overview";

export async function GET(request: Request) {
  try {
    const { db } = await authorizedStaff(request, true);
    const days = parseOverviewPeriod(new URL(request.url).searchParams.get("days"));
    if (days === null) throw new AdminError("Invalid overview date range.");
    const { data: report, error } = await db.rpc("wons_admin_overview", { period_days: days });
    if (error?.code === "42501") throw new AdminError("You do not have permission for this action.", 403);
    if (error || !report) throw new AdminError("The overview could not be loaded. Try again.", 503);
    return Response.json({ report }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return adminError(error);
  }
}
