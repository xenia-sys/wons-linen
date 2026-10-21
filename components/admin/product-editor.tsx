"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { adminFetch } from "../../lib/admin-browser";
import { parseProductDraft } from "../../lib/admin-validation";
import type {
  ProductDraft,
  AdminVariant,
  AdminImage,
} from "../../lib/admin-validation";
const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
const firstVariant = (): AdminVariant => ({
  sku: "WONS-IVORY-S",
  color: "Ivory",
  color_hex: "#eee7d7",
  size: "S",
  price_vnd: 0,
  sale_price_vnd: null,
  available_quantity: 0,
});
const empty = (): ProductDraft => ({
  name: "",
  slug: "",
  description: "",
  department: "Women",
  category: "Shirts",
  status: "hidden",
  is_demo: false,
  sort_order: 0,
  variants: [firstVariant()],
  images: [],
});
type ProductRecord = Omit<ProductDraft, "images"> & {
  product_images: (AdminImage & { sort_order: number })[];
};
function fromRecord(p: ProductRecord): ProductDraft {
  return {
    id: p.id,
    version: p.version,
    name: p.name,
    slug: p.slug,
    description: p.description,
    department: p.department,
    category: p.category,
    status: p.status,
    is_demo: p.is_demo,
    sort_order: p.sort_order,
    variants: p.variants.map((v: AdminVariant) => ({
      id: v.id,
      sku: v.sku,
      color: v.color,
      color_hex: v.color_hex,
      size: v.size,
      price_vnd: v.price_vnd,
      sale_price_vnd: v.sale_price_vnd ?? null,
      available_quantity: v.available_quantity,
    })),
    images: [...p.product_images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i: AdminImage) => ({
        id: i.id,
        storage_path: i.storage_path,
        alt: i.alt,
        color: i.color,
      })),
  };
}
async function prepareImage(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
      file.type,
    ) ||
    file.size > 20000000
  )
    throw Error(
      "Choose JPG, PNG, WebP or AVIF source images smaller than 20 MB.",
    );
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw Error("Image processing is unavailable. Try another browser.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(Error("This image could not be processed.")),
        "image/webp",
        0.86,
      ),
    );
    if (blob.size > 3000000)
      throw Error(
        "This image is too large after processing. Try a smaller source.",
      );
    return new File([blob], "product.webp", { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}
export function ProductEditor({ id }: { id?: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProductDraft>(empty),
    [loading, setLoading] = useState(!!id),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [dirty, setDirty] = useState(false);
  async function load() {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      setDraft(fromRecord((await adminFetch(`/products/${id}`)).product));
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [id]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function patch(next: Partial<ProductDraft>) {
    setDraft((prev) => ({ ...prev, ...next }));
    setDirty(true);
    setNotice("");
  }
  function variant(index: number, next: Partial<AdminVariant>) {
    patch({
      variants: draft.variants.map((v, i) =>
        i === index ? { ...v, ...next } : v,
      ),
    });
  }
  function image(index: number, next: Partial<AdminImage>) {
    patch({
      images: draft.images.map((v, i) => (i === index ? { ...v, ...next } : v)),
    });
  }
  function reorder(index: number, delta: number) {
    const next = [...draft.images];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    patch({ images: next });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const payload = parseProductDraft(draft);
      const result = await adminFetch("/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setDirty(false);
      if (!id) {
        router.replace(`/admin/products/${result.id}`);
      } else {
        // Reload database IDs for newly added variants and gallery images so
        // another save updates those records instead of inserting duplicates.
        setDraft(fromRecord((await adminFetch(`/products/${id}`)).product));
        setNotice("Product saved. The storefront now uses these changes.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: FileList | null) {
    if (!files?.length || !draft.id) return;
    if (draft.images.length + files.length > 20) {
      setError("Use up to 20 images per product.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      for (const [index, file] of Array.from(files).entries()) {
        setNotice(`Processing image ${index + 1} of ${files.length}…`);
        const optimized = await prepareImage(file);
        const body = new FormData();
        body.set("product_id", draft.id);
        body.set("file", optimized);
        const result = await adminFetch("/upload", { method: "POST", body });
        setDraft((prev) => ({
          ...prev,
          images: [
            ...prev.images,
            {
              storage_path: result.storage_path,
              alt: `${prev.name}, product view ${prev.images.length + 1}`,
              color: null,
            },
          ],
        }));
        setDirty(true);
      }
      setNotice(
        "Images uploaded. Add descriptions, set their order and save the product.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  if (loading) return <p role="status">Loading product…</p>;
  if (id && !draft.id)
    return (
      <div className="admin-panel">
        <p role="alert">{error || "Product not found."}</p>
        <button onClick={load}>Try again</button>
      </div>
    );
  const colors = [
    ...new Set(draft.variants.map((v) => v.color).filter(Boolean)),
  ];
  return (
    <form onSubmit={save}>
      <div className="admin-page-heading">
        <div>
          <Link href="/admin/products" className="admin-back">
            ← All products
          </Link>
          <h1>{id ? draft.name || "Edit product" : "New product"}</h1>
          <p>
            {dirty ? "Unsaved changes" : "Keep every product detail in place."}
          </p>
        </div>
        <div className="admin-actions">
          {id && draft.status !== "hidden" && (
            <Link
              target="_blank"
              href={`/products/${draft.slug}`}
              className="admin-text-button"
            >
              View storefront ↗
            </Link>
          )}
          <button className="button dark" disabled={busy || uploading}>
            {busy ? "Saving…" : "Save product"}
          </button>
        </div>
      </div>
      <div className="admin-feedback" aria-live="polite">
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        {notice && <p className="admin-success">{notice}</p>}
      </div>
      <fieldset className="admin-fields" disabled={busy || uploading}>
        <div className="admin-editor-layout">
          <div>
            <section className="admin-panel">
              <h2>Product details</h2>
              <label>
                Product name
                <input
                  required
                  maxLength={160}
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </label>
              <label>
                Product URL
                <input
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  value={draft.slug}
                  placeholder="relaxed-linen-shirt"
                  onChange={(e) => patch({ slug: e.target.value })}
                />
                <small>Use lowercase words separated by hyphens.</small>
              </label>
              <label>
                Description
                <textarea
                  rows={6}
                  maxLength={10000}
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </label>
              <div className="admin-form-grid">
                <label>
                  Department
                  <select
                    value={draft.department}
                    onChange={(e) =>
                      patch({
                        department: e.target
                          .value as ProductDraft["department"],
                      })
                    }
                  >
                    <option>Women</option>
                    <option>Men</option>
                  </select>
                </label>
                <label>
                  Category
                  <select
                    value={draft.category}
                    onChange={(e) =>
                      patch({
                        category: e.target.value as ProductDraft["category"],
                      })
                    }
                  >
                    {["Shirts", "Dresses", "Trousers", "Sets"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <h2>Product photography</h2>
                  <p>
                    {draft.images.length}/20 images · First image is the cover.
                  </p>
                </div>
                <label
                  className={`admin-upload-label${!id || uploading ? " disabled" : ""}`}
                >
                  {uploading ? "Uploading…" : "+ Upload images"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    disabled={!id || uploading || busy}
                    onChange={(e) => {
                      void upload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {!id && (
                <p className="admin-help">
                  Save this product as Hidden first, then upload its images.
                </p>
              )}
              {id && !draft.images.length && (
                <p className="admin-empty">
                  Add front, back, styling and detail images for the product
                  gallery.
                </p>
              )}
              <div className="admin-image-grid">
                {draft.images.map((img, i) => (
                  <div className="admin-image-card" key={img.storage_path}>
                    <Image
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${img.storage_path}`}
                      alt={img.alt}
                      width={320}
                      height={400}
                      className="admin-uploaded-image"
                    />
                    <span className="admin-image-position">
                      {i === 0 ? "Cover" : `Image ${i + 1}`}
                    </span>
                    <label>
                      Image description
                      <input
                        required
                        maxLength={300}
                        value={img.alt}
                        onChange={(e) => image(i, { alt: e.target.value })}
                      />
                    </label>
                    <label>
                      Colour
                      <select
                        value={img.color ?? ""}
                        onChange={(e) =>
                          image(i, { color: e.target.value || null })
                        }
                      >
                        <option value="">All colours</option>
                        {colors.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <div className="admin-image-actions">
                      <button
                        type="button"
                        disabled={i === 0}
                        aria-label={`Move image ${i + 1} earlier`}
                        onClick={() => reorder(i, -1)}
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={i === draft.images.length - 1}
                        aria-label={`Move image ${i + 1} later`}
                        onClick={() => reorder(i, 1)}
                      >
                        →
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          patch({
                            images: draft.images.filter((_, n) => n !== i),
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="admin-help">
                Images are resized and exported as WebP before upload. Save the
                product to publish gallery changes. Removing a gallery image
                retains the original file.
              </p>
            </section>
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <h2>Variants & pricing</h2>
                  <p>
                    Prices in VND. Leave Sale price empty for regular pricing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const s =
                      sizes.find(
                        (s) =>
                          !draft.variants.some(
                            (v) => v.color === "Ivory" && v.size === s,
                          ),
                      ) ?? "S";
                    patch({
                      variants: [
                        ...draft.variants,
                        {
                          ...firstVariant(),
                          size: s,
                          sku: `${draft.slug || "WONS"}-IVORY-${s}-${Date.now().toString(36)}`.toUpperCase(),
                        },
                      ],
                    });
                  }}
                >
                  + Add variant
                </button>
              </div>
              <div className="admin-table-scroll">
                <table className="admin-table admin-variants">
                  <thead>
                    <tr>
                      {[
                        "SKU",
                        "Colour",
                        "Swatch",
                        "Size",
                        "Regular price",
                        "Sale price",
                        "Available quantity",
                        "",
                      ].map((c, i) => (
                        <th key={i}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {draft.variants.map((v, i) => (
                      <tr key={v.id ?? i}>
                        <td>
                          <input
                            aria-label={`SKU for variant ${i + 1}`}
                            required
                            value={v.sku}
                            onChange={(e) =>
                              variant(i, { sku: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`Colour for variant ${i + 1}`}
                            required
                            value={v.color}
                            onChange={(e) =>
                              variant(i, { color: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`Colour code for variant ${i + 1}`}
                            type="color"
                            value={v.color_hex}
                            onChange={(e) =>
                              variant(i, { color_hex: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <select
                            aria-label={`Size for variant ${i + 1}`}
                            value={v.size}
                            onChange={(e) =>
                              variant(i, { size: e.target.value })
                            }
                          >
                            {sizes.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            aria-label={`Regular price for variant ${i + 1}`}
                            type="number"
                            required
                            min={1}
                            step={1}
                            value={v.price_vnd || ""}
                            onChange={(e) =>
                              variant(i, { price_vnd: Number(e.target.value) })
                            }
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`Sale price for variant ${i + 1}`}
                            type="number"
                            min={1}
                            max={v.price_vnd - 1}
                            step={1}
                            value={v.sale_price_vnd ?? ""}
                            onChange={(e) =>
                              variant(i, {
                                sale_price_vnd:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`Available quantity for variant ${i + 1}`}
                            type="number"
                            required
                            min={0}
                            step={1}
                            value={v.available_quantity}
                            onChange={(e) =>
                              variant(i, {
                                available_quantity: Number(e.target.value),
                              })
                            }
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            disabled={draft.variants.length === 1}
                            aria-label={`Remove variant ${i + 1}`}
                            onClick={() =>
                              patch({
                                variants: draft.variants.filter(
                                  (_, n) => n !== i,
                                ),
                              })
                            }
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          <aside>
            <section className="admin-panel">
              <h2>Visibility</h2>
              <label>
                Website status
                <select
                  value={draft.status}
                  onChange={(e) =>
                    patch({ status: e.target.value as ProductDraft["status"] })
                  }
                >
                  <option value="hidden">Hidden — draft</option>
                  {draft.is_demo && (
                    <option value="preview">Preview — demo data</option>
                  )}
                  <option value="published">Published</option>
                </select>
              </label>
              <p className="admin-help">
                Hidden products are removed from the public catalog and product
                links. Published products appear on new page loads after saving.
              </p>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={draft.is_demo}
                  onChange={(e) =>
                    patch({
                      is_demo: e.target.checked,
                      status:
                        !e.target.checked && draft.status === "preview"
                          ? "hidden"
                          : draft.status,
                    })
                  }
                />
                Demo product
              </label>
              <label>
                Display order
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={draft.sort_order}
                  onChange={(e) =>
                    patch({ sort_order: Number(e.target.value) })
                  }
                />
              </label>
            </section>
            <section className="admin-panel admin-note">
              <p className="eyebrow">YOUR ACCESS</p>
              <p>
                You can edit content and images, publish or hide products, and
                update regular and sale prices.
              </p>
              <p>Product updates do not open checkout or enable payments.</p>
            </section>
          </aside>
        </div>
      </fieldset>
    </form>
  );
}
