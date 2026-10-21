import {
  authorizedStaff,
  adminError,
  AdminError,
  databaseError,
} from "../../../../lib/admin-server";
import { imageFileType, validId } from "../../../../lib/admin-validation";
export async function POST(request: Request) {
  try {
    const { db } = await authorizedStaff(request);
    if (Number(request.headers.get("Content-Length") ?? 0) > 3300000)
      throw new AdminError("Optimized images must be smaller than 3 MB.", 413);
    const form = await request.formData();
    const id = form.get("product_id"),
      file = form.get("file");
    if (
      !validId(id) ||
      !(file instanceof File) ||
      file.size < 12 ||
      file.size > 3000000
    )
      throw new AdminError(
        "Choose a JPG, PNG, WebP or AVIF image smaller than 3 MB after optimization.",
      );
    const { data: product } = await db
      .from("products")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (!product)
      throw new AdminError("Save this product before uploading images.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = imageFileType(bytes);
    if (!type)
      throw new AdminError(
        "Unsupported image file. SVG and document files are not accepted.",
      );
    const path = `${id}/${crypto.randomUUID()}.${type.ext}`;
    const { error } = await db.storage
      .from("product-images")
      .upload(path, bytes, { contentType: type.mime, upsert: false });
    if (error) throw databaseError(error);
    return Response.json(
      { storage_path: path },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return adminError(e);
  }
}
