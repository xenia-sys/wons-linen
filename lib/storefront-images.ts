export const STOREFRONT_IMAGE_BUCKET = "storefront-images";

export const storefrontImageSlots = [
  { id: "home-hero", label: "Homepage main cover", description: "The main photo next to the headline at the top of the homepage." },
  { id: "home-women", label: "Women cover", description: "The Women collection tile on the homepage." },
  { id: "home-men", label: "Men cover", description: "The Men collection tile on the homepage." },
] as const;

export type StorefrontImageSlot = (typeof storefrontImageSlots)[number]["id"];
export type StorefrontImage = { id: StorefrontImageSlot; storage_path: string; alt: string };

export function isStorefrontImageSlot(value: unknown): value is StorefrontImageSlot {
  return storefrontImageSlots.some(slot => slot.id === value);
}

export function storefrontImageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STOREFRONT_IMAGE_BUCKET}/${path}`;
}
