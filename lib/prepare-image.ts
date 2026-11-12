const types = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export async function prepareImage(file: File) {
  if (!types.includes(file.type) || file.size > 20000000)
    throw Error("Choose a JPG, PNG, WebP or AVIF image smaller than 20 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw Error("Image processing is unavailable. Try another browser.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      result => result ? resolve(result) : reject(Error("This image could not be processed.")), "image/webp", 0.86,
    ));
    if (blob.size > 3000000) throw Error("This image is too large after processing. Try a smaller source.");
    return new File([blob], "image.webp", { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}
