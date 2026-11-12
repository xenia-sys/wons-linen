import { createPublicSupabaseClient } from "./supabase";
import type { StorefrontImage, StorefrontImageSlot } from "./storefront-images";

export async function getStorefrontImages() {
  const images: Partial<Record<StorefrontImageSlot, StorefrontImage>> = {};
  try {
    const { data, error } = await createPublicSupabaseClient()
      .from("storefront_images").select("id,storage_path,alt")
      .abortSignal(AbortSignal.timeout(5000));
    if (!error && data)
      for (const image of data as StorefrontImage[]) images[image.id] = image;
  } catch {
    // The default artwork still renders if the optional cover read fails.
  }
  return images;
}
