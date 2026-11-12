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
    const product = db
      .from("products")
      .select("*,variants(*),product_images(*)")
      .eq("id", id)
      .maybeSingle();
    const [{ data, error }, pricing] = await Promise.all([product, db.rpc("current_wons_discount_pricing")]);
    if (error) throw databaseError(error);
    if (!data) throw new AdminError("Product not found.", 404);
    if (pricing.error) throw databaseError(pricing.error);
    return Response.json(
      { product: data, discountPercent: pricing.data?.rates?.[id] ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return adminError(e);
  }
}
