import {
  authorizedStaff,
  adminError,
  adminJson,
  databaseError,
} from "../../../../lib/admin-server";
import { parseProductDraft } from "../../../../lib/admin-validation";
export async function GET(request: Request) {
  try {
    const { db } = await authorizedStaff(request);
    const { data, error } = await db
      .from("products")
      .select(
        "id,slug,name,department,category,status,is_demo,version,updated_at,variants(id,price_vnd,sale_price_vnd),product_images(id,storage_path,sort_order)",
      )
      .order("updated_at", { ascending: false });
    if (error) throw databaseError(error);
    return Response.json(
      { products: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return adminError(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db } = await authorizedStaff(request);
    const draft = parseProductDraft(await adminJson(request));
    const { data, error } = await db.rpc("admin_save_product", {
      payload: draft,
    });
    if (error) throw databaseError(error);
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return adminError(e);
  }
}
