import { imageFileType } from "./admin-validation.ts";
import { OPTIMIZED_PHOTO_BYTES } from "./product-photo-upload.ts";

type DecodedImage = { source: CanvasImageSource; width: number; height: number; release: () => void };
const heifBrands = ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"];
const attempts = [
  { edge: 2000, quality: 0.86 },
  { edge: 2000, quality: 0.72 },
  { edge: 1600, quality: 0.72 },
  { edge: 1200, quality: 0.68 },
  { edge: 960, quality: 0.65 },
];

async function decodeImage(blob: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const image = await createImageBitmap(blob);
      return { source: image, width: image.width, height: image.height, release: () => image.close() };
    } catch {
      // Some browsers can display images that their bitmap decoder rejects.
    }
  }
  const image = new Image();
  const url = URL.createObjectURL(blob);
  try {
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw Error(blob.type === "image/heic"
      ? "This browser cannot open this HEIC image. Export it as JPG or PNG and try again."
      : "This image could not be opened. Re-export it as JPG or PNG and try again.");
  }
}

export async function prepareImage(file: File, options: { productPhoto?: boolean } = {}) {
  const maxMB = options.productPhoto ? 40 : 20;
  if (file.size > maxMB * 1_000_000) throw Error(`This file exceeds ${maxMB} MB. Export a smaller copy and try again.`);
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const box = new TextDecoder().decode(header);
  const heif = box.slice(4, 8) === "ftyp" && heifBrands.includes(box.slice(8, 12));
  const mime = imageFileType(header)?.mime ?? (options.productPhoto && heif ? "image/heic" : null);
  if (!mime) throw Error("Unsupported image file. Use a JPG, PNG, WebP or AVIF image.");
  // Use the bytes to identify the format; browser-provided file.type can be empty.
  const image = await decodeImage(file.type === mime ? file : file.slice(0, file.size, mime));
  const canvas = document.createElement("canvas");
  try {
    const context = canvas.getContext("2d");
    if (!context) throw Error("Image processing is unavailable. Try another browser.");
    for (const { edge, quality } of attempts) {
      const scale = Math.min(1, edge / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      canvas.width = width;
      canvas.height = height;
      context.drawImage(image.source, 0, 0, width, height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", quality));
      if (blob && blob.size >= 12 && blob.size <= OPTIMIZED_PHOTO_BYTES)
        return new File([blob], blob.type === "image/webp" ? "image.webp" : "image.png", { type: blob.type });
    }
    throw Error("This image could not be reduced to 3 MB. Export a smaller copy and try again.");
  } finally {
    image.release();
    canvas.width = canvas.height = 0;
  }
}
