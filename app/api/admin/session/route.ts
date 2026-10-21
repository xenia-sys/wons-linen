import { authorizedStaff, adminError } from "../../../../lib/admin-server";
export async function GET(request: Request) {
  try {
    const { user, role } = await authorizedStaff(request);
    return Response.json(
      { email: user.email, role },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return adminError(e);
  }
}
