import { readFileSync, existsSync } from "node:fs";
const values = { ...process.env };
for (const file of [".env.local", ".env.development.local"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) values[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
}
const url = values.NEXT_PUBLIC_SUPABASE_URL;
const key = values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Missing public Supabase configuration.");
const response = await fetch(new URL("/auth/v1/settings", url), {
  headers: { apikey: key },
  signal: AbortSignal.timeout(15000),
});
if (!response.ok)
  throw new Error(
    `Supabase public API verification failed: HTTP ${response.status}`,
  );
const catalog = await fetch(
  new URL(
    "/rest/v1/products?select=id,slug,is_demo,status,variants(id,price_vnd,available_quantity)&order=sort_order",
    url,
  ),
  { headers: { apikey: key }, signal: AbortSignal.timeout(15000) },
);
if (!catalog.ok)
  throw new Error(
    `Supabase catalog verification failed: HTTP ${catalog.status}`,
  );
const products = await catalog.json();
if (!Array.isArray(products) || products.length === 0)
  throw new Error("The visible catalog is empty.");
const variants = products.flatMap((product) => product.variants);
if (
  variants.some(
    (variant) =>
      !Number.isSafeInteger(variant.price_vnd) ||
      variant.price_vnd <= 0 ||
      !Number.isSafeInteger(variant.available_quantity) ||
      variant.available_quantity < 0,
  )
)
  throw new Error("Invalid catalog price or quantity.");
if (new Set(variants.map((v) => v.id)).size !== variants.length)
  throw new Error("Duplicate variant identifiers.");
console.log(
  `WONS public API verified: Auth HTTP ${response.status}, catalog HTTP ${catalog.status}; ${products.length} visible products and ${variants.length} variants. No credentials printed or rows written.`,
);
