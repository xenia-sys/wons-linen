"use client";
import { useAdminLanguage } from "./admin-language";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { adminFetch } from "../../lib/admin-browser";
import { money, unitPrice } from "../../lib/commerce";
import type { Variant } from "../../lib/types";
import { useStaff } from "./admin-shell";
type Item = {
  id: string;
  slug: string;
  name: string;
  department: string;
  new_arrival: boolean | null;
  category: string;
  status: string;
  is_demo: boolean;
  updated_at: string;
  variants: Variant[];
};
export function ProductList() {
  const { t, errorText, dateLocale } = useAdminLanguage();
  const owner = useStaff().role === "owner";
  const [products, setProducts] = useState<Item[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("All"),
    [department, setDepartment] = useState("All"),
    [trash, setTrash] = useState(false),
    [selected, setSelected] = useState<Item | null>(null),
    [changing, setChanging] = useState(false),
    [actionError, setActionError] = useState(""),
    [notice, setNotice] = useState("");
  const modal = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listTitle = useRef<HTMLHeadingElement>(null);
  const inTrash = owner && trash;
  const load = useCallback(async (signal?: AbortSignal) => {
    setBusy(true);
    setError("");
    try {
      const result = await adminFetch(inTrash ? "/products?view=trash" : "/products", { signal });
      if (!signal?.aborted) setProducts(result.products);
    } catch (e) {
      if (!signal?.aborted) setError((e as Error).message);
    } finally {
      if (!signal?.aborted) setBusy(false);
    }
  }, [inTrash]);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  useLayoutEffect(() => {
    const dialog = modal.current;
    if (!dialog) return;
    if (selected && !dialog.open) {
      dialog.showModal();
      cancel.current?.focus({ preventScroll: true });
    } else if (!selected && dialog.open) {
      dialog.close();
      (trigger.current?.isConnected ? trigger.current : listTitle.current)?.focus({ preventScroll: true });
    }
  }, [selected]);

  function changeView(next: boolean) {
    setBusy(true);
    setNotice("");
    setQuery("");
    setStatus("All");
    setDepartment("All");
    setTrash(next);
  }

  async function changeProduct(product: Item, restore: boolean) {
    if (changing) return;
    setChanging(true);
    setActionError("");
    setNotice("");
    try {
      await adminFetch(`/products/${product.id}`, { method: restore ? "PATCH" : "DELETE" });
      setProducts(current => current.filter(item => item.id !== product.id));
      setSelected(null);
      setNotice(restore ? "Product restored as a hidden draft." : "Product moved to trash.");
      if (restore) listTitle.current?.focus({ preventScroll: true });
    } catch (error) {
      setActionError((error as Error).message);
    } finally {
      setChanging(false);
    }
  }
  const filtered = products.filter(
    (p) =>
      (inTrash || status === "All" || p.status === status) &&
      (department === "All" || (department === "New Arrivals" ? p.new_arrival === true : p.department === department)) &&
      `${p.name} ${p.slug}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">{t("THE COLLECTION")}</p>
          <h1 ref={listTitle} tabIndex={-1}>{t(inTrash ? "Product trash" : "Products")}</h1>
          <p>{t(inTrash ? "Restore a product as a hidden draft." : "Manage imagery, descriptions, visibility and prices.")}</p>
        </div>
        <div className="admin-actions">
          {owner && <button type="button" disabled={busy || changing} onClick={() => changeView(!inTrash)}>
            {t(inTrash ? "← All products" : "Trash")}
          </button>}
          {!inTrash && <Link href="/admin/products/new" className="button dark"> {t("+ New product")} </Link>}
        </div>
      </div>
      {!inTrash && <div className="admin-stat-row">
        <div>
          <strong>{products.length}</strong>
          <span>{t("Total styles")}</span>
        </div>
        <div>
          <strong>
            {products.filter((p) => p.status === "published").length}
          </strong>
          <span>{t("Published")}</span>
        </div>
        <div>
          <strong>
            {products.filter((p) => p.status === "hidden").length}
          </strong>
          <span>{t("Hidden")}</span>
        </div>
      </div>}
      <div className="admin-panel">
        {notice && <p role="status" className="admin-success">{t(notice)}</p>}
        {inTrash && actionError && <p role="alert" className="admin-error">{errorText(actionError)}</p>}
        <dialog className="admin-team-confirm admin-product-confirm" ref={modal} role="alertdialog"
          aria-labelledby="trash-product-title" aria-describedby="trash-product-name trash-product-description"
          onCancel={event => { event.preventDefault(); if (!changing) setSelected(null); }}>
          {selected && <>
            <h3 id="trash-product-title">{t("Delete this product?")}</h3>
            <p id="trash-product-name"><strong>{selected.name}</strong></p>
            <p id="trash-product-description">{t("The product will disappear from the storefront and move to Trash. You can restore it as a hidden draft.")}</p>
            {actionError && <p role="alert" className="admin-error">{errorText(actionError)}</p>}
            <div className="admin-actions">
              <button type="button" ref={cancel} disabled={changing} onClick={() => setSelected(null)}>{t("Cancel")}</button>
              <button type="button" className="admin-danger-button" disabled={changing} onClick={() => void changeProduct(selected, false)}>
                {t(changing ? "Deleting…" : "Delete product")}
              </button>
            </div>
          </>}
        </dialog>
        <div className="admin-filters">
          <label> {t("Search")} <input
              type="search"
              placeholder={t("Product name or URL")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label> {t("Department")} <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="All">{t("All")}</option>
              <option value="Women">{t("Women")}</option>
              <option value="Men">{t("Men")}</option>
              <option value="New Arrivals">{t("New Arrivals")}</option>
            </select>
          </label>
          {!inTrash && <label> {t("Visibility")} <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="All">{t("All")}</option>
              <option value="published">{t("Published")}</option>
              <option value="preview">{t("Preview")}</option>
              <option value="hidden">{t("Hidden")}</option>
            </select>
          </label>}
        </div>
        {busy ? (
          <p role="status">{t("Loading products…")}</p>
        ) : error ? (
          <div role="alert">
            {errorText(error)}
            <button type="button" onClick={() => void load()}>{t("Try again")}</button>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("Product")}</th>
                  <th>{t("Department")}</th>
                  <th>{t("Visibility")}</th>
                  <th>{t("Price from")}</th>
                  <th>{t("Updated")}</th>
                  {!inTrash && <th>
                    <span className="admin-sr-only">{t("Edit")}</span>
                  </th>}
                  {owner && <th>{t(inTrash ? "Restore" : "Delete")}</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {inTrash ? <strong>{p.name}</strong> : <Link
                        href={`/admin/products/${p.id}`}
                        className="admin-product-link"
                      >
                        {p.name}
                      </Link>}
                      <small>
                        {t(p.category)}
                        {p.is_demo ? " " + t("· Demo") : ""}
                      </small>
                    </td>
                    <td>{t(p.department)}{p.new_arrival && <small>{t("New Arrivals")}</small>}</td>
                    <td>
                      <span className={`admin-badge status-${p.status}`}>
                        {t(p.status.charAt(0).toUpperCase() + p.status.slice(1))}
                      </span>
                    </td>
                    <td>
                      {p.variants.length
                        ? money(Math.min(...p.variants.map(unitPrice)))
                        : t("No variants")}
                    </td>
                    <td>
                      {new Date(p.updated_at).toLocaleDateString(dateLocale)}
                    </td>
                    {!inTrash && <td>
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="admin-edit-link"
                      > {t("Edit →")} </Link>
                    </td>}
                    {owner && <td>
                      {inTrash ? <button type="button" disabled={changing} onClick={() => void changeProduct(p, true)}>
                        {t("Restore")}
                      </button> : <button type="button" className="admin-danger-button" aria-haspopup="dialog" disabled={changing}
                        onClick={event => {
                          trigger.current = event.currentTarget;
                          setActionError("");
                          setSelected(p);
                        }}>{t("Delete")}</button>}
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <p className="admin-empty">{t(inTrash && !products.length ? "No products in the trash." : "No products match these filters.")}</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
