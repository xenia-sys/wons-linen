import {
  authorizedStaff,
  adminError,
  AdminError,
  databaseError,
} from "../../../../../lib/admin-server";
import { validId } from "../../../../../lib/admin-validation";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db } = await authorizedStaff(request);
    const { id } = await params;
    if (!validId(id)) throw new AdminError("Product not found.", 404);
    const { data, error } = await db
      .from("products")
      .select("*,variants(*),product_images(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw databaseError(error);
    if (!data) throw new AdminError("Product not found.", 404);
    return Response.json(
      { product: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return adminError(e);
  }
}
