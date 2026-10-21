import type { Product } from "./types.ts";

export type IllustrationView = "front" | "back" | "detail" | "fabric";
export type GalleryMedia =
  | { id: string; kind: "photo"; src: string; alt: string; label: string }
  | {
      id: string;
      kind: "illustration";
      view: IllustrationView;
      alt: string;
      label: string;
    };

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
