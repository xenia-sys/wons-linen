export const FREE_SIZE = "Free size";
export const PRODUCT_SIZES: readonly string[] = ["XS", "S", "M", "L", "XL", "XXL", FREE_SIZE];

export function isFreeSizeProduct(variants: readonly { size: string }[]): boolean {
  return variants.length > 0 && variants.every(variant => variant.size === FREE_SIZE);
}

// A single available Free size option needs no extra selection from the customer.
// Preserve an available size when switching colours; never select sold-out stock.
export function selectedSizeForColour(
  variants: readonly { size: string; color: string; available_quantity: number }[],
  color: string,
  previousSize = "",
): string {
  const available = variants.filter(variant => variant.color === color && variant.available_quantity > 0);
  if (available.some(variant => variant.size === previousSize)) return previousSize;
  return available.length === 1 && available[0].size === FREE_SIZE ? FREE_SIZE : "";
}
