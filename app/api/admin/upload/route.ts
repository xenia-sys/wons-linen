import {
  authorizedStaff,
  adminError,
  AdminError,
  databaseError,
} from "../../../../lib/admin-server";
import { imageFileType, validId } from "../../../../lib/admin-validation";
import { OPTIMIZED_PHOTO_BYTES } from "../../../../lib/product-photo-upload";
export async function POST(request: Request) {
  try {
    const { db } = await authorizedStaff(request);
    if (Number(request.headers.get("Content-Length") ?? 0) > OPTIMIZED_PHOTO_BYTES + 100_000)
      throw new AdminError("Optimized images must be smaller than 3 MB.", 413);
    const form = await request.formData().catch(() => {
      throw new AdminError("The image request could not be read. Select the file again.");
    });
    const id = form.get("product_id"),
      file = form.get("file");
    if (!validId(id)) throw new AdminError("Save this product before uploading images.");
    if (!(file instanceof File) || file.size < 12) throw new AdminError("Select a valid image file.");
    if (file.size > OPTIMIZED_PHOTO_BYTES) throw new AdminError("The optimized image exceeds 3 MB.", 413);
    const { data: product, error: productError } = await db
      .from("products")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (productError) throw databaseError(productError);
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
