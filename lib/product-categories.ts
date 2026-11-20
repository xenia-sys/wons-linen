export const PRODUCT_CATEGORIES = ["Shirts", "Dresses", "Skirts", "Trousers", "Shorts", "Sets"] as const;
export type Category = typeof PRODUCT_CATEGORIES[number];
