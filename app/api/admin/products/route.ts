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
    const products = db
      .from("products")
      .select(
        "id,slug,name,department,new_arrival,category,status,is_demo,version,updated_at,variants(id,price_vnd,sale_price_vnd),product_images(id,storage_path,sort_order)",
      )
      .order("updated_at", { ascending: false });
    const [{ data, error }, pricing] = await Promise.all([products, db.rpc("current_wons_discount_pricing")]);
    if (error) throw databaseError(error);
    if (pricing.error) throw databaseError(pricing.error);
    return Response.json(
      { products: data.map(product => ({ ...product, variants: product.variants.map(variant => ({
        ...variant, discount_percent: pricing.data?.rates?.[product.id],
      })) })) },
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
    const { data, error } = await db.rpc("admin_save_product_with_arrival", {
      payload: draft,
    });
    if (error) throw databaseError(error);
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return adminError(e);
  }
}
