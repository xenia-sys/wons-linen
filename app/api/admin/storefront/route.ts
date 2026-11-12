import { authorizedStaff, adminError, AdminError, databaseError } from "../../../../lib/admin-server";
import { imageFileType } from "../../../../lib/admin-validation";
import { isStorefrontImageSlot, STOREFRONT_IMAGE_BUCKET } from "../../../../lib/storefront-images";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const { db } = await authorizedStaff(request, true);
    const { data, error } = await db.from("storefront_images").select("id,storage_path,alt");
    if (error) throw new AdminError("The storefront images could not be loaded. Try again.", 503);
    return Response.json({ images: data }, { headers });
  } catch (error) {
    return adminError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { db } = await authorizedStaff(request, true);
    if (Number(request.headers.get("Content-Length") ?? 0) > 3300000)
      throw new AdminError("Optimized images must be smaller than 3 MB.", 413);
    const form = await request.formData();
    const id = form.get("slot"), file = form.get("file"), alt = form.get("alt");
    if (!isStorefrontImageSlot(id)) throw new AdminError("Choose a valid storefront cover.");
    if (typeof alt !== "string" || !alt.trim() || alt.trim().length > 300)
      throw new AdminError("Enter an image description between 1 and 300 characters.");
    if (!(file instanceof File) || file.size < 12 || file.size > 3000000)
      throw new AdminError("Choose a JPG, PNG, WebP or AVIF image smaller than 3 MB after optimization.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const format = imageFileType(bytes);
    if (!format) throw new AdminError("Unsupported image file.");
    const storage_path = `${id}/${crypto.randomUUID()}.${format.ext}`;
    const { error: uploadError } = await db.storage.from(STOREFRONT_IMAGE_BUCKET)
      .upload(storage_path, bytes, { contentType: format.mime, upsert: false });
    if (uploadError) throw databaseError(uploadError);
    const { data, error } = await db.from("storefront_images")
      .upsert({ id, storage_path, alt: alt.trim() }).select("id,storage_path,alt").single();
    if (error) throw new AdminError("The cover could not be published. The previous cover is unchanged.", 503);
    return Response.json({ image: data }, { headers });
  } catch (error) {
    return adminError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { db } = await authorizedStaff(request, true);
    const id = new URL(request.url).searchParams.get("slot");
    if (!isStorefrontImageSlot(id)) throw new AdminError("Choose a valid storefront cover.");
    const { error } = await db.from("storefront_images").delete().eq("id", id);
    if (error) throw new AdminError("The default artwork could not be restored.", 503);
    return Response.json({ restored: true }, { headers });
  } catch (error) {
    return adminError(error);
  }
}
