export const PRODUCT_IMAGE_LIMIT = 20;
export const OPTIMIZED_PHOTO_BYTES = 3_000_000;
export const PRODUCT_IMAGE_ACCEPT = [
  "image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif",
  ".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic", ".heif",
].join(",");

export async function uploadProductPhotoBatch(files: readonly File[], existing: number, options: {
  upload: (file: File) => Promise<void>;
  progress: (file: File, index: number) => void;
  stopOnError?: (error: unknown) => boolean;
}) {
  const failed: { name: string; message: string }[] = [];
  let added = 0;
  let overLimit = 0;
  let interrupted = 0;
  for (const [index, file] of files.entries()) {
    if (existing + added >= PRODUCT_IMAGE_LIMIT) {
      overLimit = files.length - index;
      break;
    }
    options.progress(file, index);
    try {
      await options.upload(file);
      added++;
    } catch (error) {
      failed.push({ name: file.name, message: error instanceof Error ? error.message : "Could not upload this file." });
      if (options.stopOnError?.(error)) {
        interrupted = files.length - index - 1;
        break;
      }
    }
  }
  return { added, failed, overLimit, interrupted };
}
