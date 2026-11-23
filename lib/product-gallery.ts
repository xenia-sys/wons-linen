import type { Product } from "./types.ts";
import type { ImageFraming } from "./image-framing.ts";

export type IllustrationView = "front" | "back" | "detail" | "fabric";
export function gallerySwipeDirection(dx: number, dy: number, width = 280, velocity = 0): -1 | 0 | 1 {
  const threshold = Math.max(34, Math.min(88, width * 0.16));
  const flick = Math.abs(dx) >= 22 && Math.abs(velocity) >= 0.45 && Math.sign(velocity) === Math.sign(dx);
  if ((Math.abs(dx) < threshold && !flick) || Math.abs(dx) <= Math.abs(dy) * 1.35) return 0;
  return dx < 0 ? 1 : -1;
}

export function galleryDragOffset(offset: number, width: number, index: number, count: number) {
  if ((offset > 0 && index === 0) || (offset < 0 && index === count - 1)) {
    const distance = Math.abs(offset);
    return Math.sign(offset) * (distance * 0.24) / (1 + distance / Math.max(width, 1));
  }
  return Math.max(-width, Math.min(width, offset));
}

export function galleryIndex(index: number, count: number) {
  return Math.max(0, Math.min(count - 1, index));
}

export type GalleryMedia =
  | { id: string; kind: "photo"; src: string; alt: string; label: string; framing?: ImageFraming | null }
  | {
      id: string;
      kind: "illustration";
      view: IllustrationView;
      alt: string;
      label: string;
    };

/** Open a product on a colour that has its own photography, following gallery order. */
export function preferredColour(product: Product): string {
  const colours = [...new Set(product.variants.map((variant) => variant.color))];
  const pictured = (product.images ?? []).find(
    (image) => image.color && colours.includes(image.color),
  );
  return pictured?.color ?? colours[0];
}

/**
 * The photo used when a product link is shared (Facebook, Zalo, Messenger):
 * the first photo of the colour the product page opens on, else its first photo.
 */
export function shareImage(product: Product) {
  const images = product.images ?? [];
  const colour = preferredColour(product);
  return images.find((image) => image.color === colour) ?? images[0];
}

/**
 * The photo a catalog card reveals on hover: the back view of the cover's colour
 * when there is one, otherwise the next photo of that colour (or a shared photo).
 */
export function cardHoverImage(product: Product) {
  const [cover, ...rest] = product.images ?? [];
  if (!cover) return undefined;
  const sameColour = rest.filter(
    (image) => image.src !== cover.src && (!image.color || !cover.color || image.color === cover.color),
  );
  return sameColour.find((image) => /^back view\b/i.test(image.alt)) ?? sameColour[0];
}

export function getProductGallery(
  product: Product,
  color: string,
): GalleryMedia[] {
  const images = (product.images ?? []).filter(
    (image) => !image.color || image.color === color,
  );
  if (images.length) {
    return images.map((image) => ({
      ...image,
      kind: "photo",
      label: image.alt,
    }));
  }
  const views: { view: IllustrationView; label: string }[] = [
    { view: "front", label: "Full silhouette" },
    { view: "back", label: "Back view" },
    { view: "detail", label: "A closer look" },
    { view: "fabric", label: "Texture study" },
  ];
  return views.map(({ view, label }) => ({
    id: `illustration-${view}`,
    kind: "illustration",
    view,
    label,
    alt: `${label} — concept illustration of ${product.name} in ${color}`,
  }));
}
