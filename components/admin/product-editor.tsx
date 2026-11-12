"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PhotoFraming } from "./photo-framing";
import { useRouter } from "next/navigation";
import { adminFetch, AdminRequestError } from "../../lib/admin-browser";
import { parseProductDraft } from "../../lib/admin-validation";
import { prepareImage } from "../../lib/prepare-image";
import { PRODUCT_IMAGE_ACCEPT, PRODUCT_IMAGE_LIMIT, uploadProductPhotoBatch } from "../../lib/product-photo-upload";
import { formatDisplayPrice, parseUsdQuote } from "../../lib/display-currency";
import { money, percentagePrice } from "../../lib/commerce";
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
  new_arrival: null,
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
    new_arrival: p.new_arrival ?? null,
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
        framing: i.framing ?? null,
      })),
  };
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
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);
  const [quote, setQuote] = useState<ReturnType<typeof parseUsdQuote>>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [photoProgress, setPhotoProgress] = useState("");
  const [coverNotice, setCoverNotice] = useState("");
  const [photoResult, setPhotoResult] = useState<Awaited<ReturnType<typeof uploadProductPhotoBatch>> | null>(null);
  const uploadingPhotos = useRef(false);
  const galleryFull = draft.images.length >= PRODUCT_IMAGE_LIMIT;

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/display-currency", { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(6000)]) })
      .then(async response => {
        if (response.ok && !controller.signal.aborted) setQuote(parseUsdQuote(await response.json()));
      })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setQuoteLoading(false); });
    return () => controller.abort();
  }, []);

  async function loadRecord(productId: string) {
    const result = await adminFetch(`/products/${productId}`);
    setDraft(fromRecord(result.product));
    setDiscountPercent(result.discountPercent);
  }
  async function load() {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      await loadRecord(id);
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
    setCoverNotice("");
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
    setCoverNotice("");
    setBusy(true);
    try {
      const payload = parseProductDraft(draft);
      const result = await adminFetch("/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setDirty(false);
      setPhotoResult(null);
      if (!id) {
        router.replace(`/admin/products/${result.id}`);
      } else {
        // Reload database IDs for newly added variants and gallery images so
        // another save updates those records instead of inserting duplicates.
        await loadRecord(id);
        setNotice("Product saved. The storefront now uses these changes.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: File[]) {
    const productId = draft.id;
    if (!files.length || !productId || uploadingPhotos.current || busy) return;
    uploadingPhotos.current = true;
    setUploading(true);
    setError("");
    setNotice("");
    setCoverNotice("");
    setPhotoResult(null);
    try {
      setPhotoResult(await uploadProductPhotoBatch(files, draft.images.length, {
        progress: (file, index) => setPhotoProgress(`Uploading ${index + 1} of ${files.length}: ${file.name}`),
        stopOnError: error => error instanceof AdminRequestError && (error.status === 401 || error.status === 403),
        upload: async (file) => {
          const optimized = await prepareImage(file, { productPhoto: true });
          const body = new FormData();
          body.set("product_id", productId);
          body.set("file", optimized);
          const { storage_path } = await adminFetch("/upload", { method: "POST", body });
          setDraft(prev => ({
            ...prev,
            images: [...prev.images, {
              storage_path,
              alt: `${prev.name}, product view ${prev.images.length + 1}`,
              color: null,
              framing: null,
            }],
          }));
          setDirty(true);
        },
      }));
    } finally {
      uploadingPhotos.current = false;
      setUploading(false);
      setPhotoProgress("");
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
        </div>
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
                    value={draft.new_arrival ? "New Arrivals" : draft.department}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "New Arrivals") patch({ new_arrival: true });
                      else if (value === "Women" || value === "Men")
                        patch({ department: value, new_arrival: draft.new_arrival === true ? false : draft.new_arrival });
                    }}
                  >
                    <option>Women</option>
                    <option>Men</option>
                    <option>New Arrivals</option>
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
              {draft.new_arrival && <label>
                Main department
                <select value={draft.department} onChange={(e) => {
                  if (e.target.value === "Women" || e.target.value === "Men")
                    patch({ department: e.target.value });
                }}>
                  <option>Women</option>
                  <option>Men</option>
                </select>
                <small>The product stays in its main department and is featured in New Arrivals when published.</small>
              </label>}
            </section>
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <h2>Product photography</h2>
                  <p>
                    {draft.images.length}/{PRODUCT_IMAGE_LIMIT} images · Set a cover for the storefront cards.
                  </p>
                </div>
                <label
                  className={`admin-upload-label${!id || uploading || busy || galleryFull ? " disabled" : ""}`}
                >
                  {uploading ? "Uploading…" : galleryFull ? "Gallery full" : "+ Upload images"}
                  <input
                    type="file"
                    accept={PRODUCT_IMAGE_ACCEPT}
                    multiple
                    disabled={!id || uploading || busy || galleryFull}
                    onChange={(e) => {
                      const files = Array.from(e.currentTarget.files ?? []);
                      e.currentTarget.value = "";
                      void upload(files);
                    }}
                  />
                </label>
              </div>
              {photoProgress && <p className="admin-photo-feedback" role="status">{photoProgress}</p>}
              {coverNotice && <p className="admin-success admin-photo-feedback" role="status">{coverNotice}</p>}
              {photoResult && <div className="admin-photo-feedback">
                {photoResult.added > 0 && <p className="admin-success" role="status">
                  {photoResult.added} {photoResult.added === 1 ? "image" : "images"} added. Select <strong>Save product</strong> to publish gallery changes.
                </p>}
                {photoResult.failed.length > 0 && <div className="admin-error" role="alert">
                  <p>{photoResult.failed.length === 1 ? "One file could not be uploaded:" : `${photoResult.failed.length} files could not be uploaded:`}</p>
                  <ul>{photoResult.failed.map((file, i) => <li key={i}><strong>{file.name}</strong>: {file.message}</li>)}</ul>
                  {photoResult.interrupted > 0 && <p>Upload paused. Select the remaining files after checking your store access.</p>}
                </div>}
                {photoResult.overLimit > 0 && <p role="status">The gallery is full. {photoResult.overLimit} {photoResult.overLimit === 1 ? "file was" : "files were"} skipped.</p>}
              </div>}
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
                    <PhotoFraming
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${img.storage_path}`}
                      alt={img.alt}
                      framing={img.framing}
                      index={i}
                      disabled={busy || uploading}
                      onChange={framing => image(i, { framing })}
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
                      {i > 0 && <button type="button" disabled={busy || uploading} onClick={() => {
                        patch({ images: [img, ...draft.images.filter((_, index) => index !== i)] });
                        setCoverNotice("Cover selected. Save product to publish it.");
                      }}>Set as cover</button>}
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
                Select JPG, PNG, WebP or AVIF photos up to 40 MB each. HEIC works in browsers that can open it.
                Images are resized before upload. Save the
                product to publish gallery changes, including image framing. Removing a gallery image
                retains the original file.
              </p>
            </section>
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <h2>Variants & pricing</h2>
                  <p>
                    Set the base price in VND. USD is a reference conversion. Schedule offers in <Link href="/admin/discount-events" className="underlined-link">Discount events</Link>.
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
                        "Price (VND)",
                        "Price (USD)",
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
                            aria-label={`Price in VND for variant ${i + 1}`}
                            type="number"
                            required
                            min={1}
                            step={1}
                            value={v.price_vnd || ""}
                            onChange={(e) => {
                              const price_vnd = Number(e.target.value);
                              variant(i, { price_vnd, sale_price_vnd: v.sale_price_vnd !== null && v.sale_price_vnd >= price_vnd ? null : v.sale_price_vnd });
                            }}
                          />
                          {discountPercent && v.price_vnd > 0 ? <small className="admin-variant-offer">{money(percentagePrice(v.price_vnd, discountPercent))} (−{discountPercent}%)</small> : null}
                        </td>
                        <td>
                          <span className="admin-usd-price">{quote && v.price_vnd > 0 ? formatDisplayPrice(v.price_vnd, quote) : quoteLoading ? "Loading…" : !quote ? "Unavailable" : "—"}</span>
                          {quote && discountPercent && v.price_vnd > 0 ? <small className="admin-variant-offer">{formatDisplayPrice(percentagePrice(v.price_vnd, discountPercent), quote)}</small> : null}
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
      <div className="admin-panel admin-product-save">
        <div className="admin-product-save-feedback">
          {error ? <p className="admin-error" role="alert">{error}</p>
            : <p className={notice ? "admin-success" : "admin-help"} role="status">
              {notice || (dirty ? "Unsaved changes" : "Save your product details when you’re ready.")}
            </p>}
        </div>
        <button type="submit" className="button dark" disabled={busy || uploading}>
          {busy ? "Saving…" : "Save product"}
        </button>
      </div>
    </form>
  );
}
