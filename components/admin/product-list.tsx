"use client";
import { useAdminLanguage } from "./admin-language";
import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "../../lib/admin-browser";
import { money, unitPrice } from "../../lib/commerce";
import type { Variant } from "../../lib/types";
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
  const [products, setProducts] = useState<Item[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("All"),
    [department, setDepartment] = useState("All");
  async function load() {
    setBusy(true);
    setError("");
    try {
      setProducts((await adminFetch("/products")).products);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const filtered = products.filter(
    (p) =>
      (status === "All" || p.status === status) &&
      (department === "All" || (department === "New Arrivals" ? p.new_arrival === true : p.department === department)) &&
      `${p.name} ${p.slug}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">{t("THE COLLECTION")}</p>
          <h1>{t("Products")}</h1>
          <p>{t("Manage imagery, descriptions, visibility and prices.")}</p>
        </div>
        <Link href="/admin/products/new" className="button dark"> {t("+ New product")} </Link>
      </div>
      <div className="admin-stat-row">
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
      </div>
      <div className="admin-panel">
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
          <label> {t("Visibility")} <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="All">{t("All")}</option>
              <option value="published">{t("Published")}</option>
              <option value="preview">{t("Preview")}</option>
              <option value="hidden">{t("Hidden")}</option>
            </select>
          </label>
        </div>
        {busy ? (
          <p role="status">{t("Loading products…")}</p>
        ) : error ? (
          <div role="alert">
            {errorText(error)}
            <button onClick={load}>{t("Try again")}</button>
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
                  <th>
                    <span className="admin-sr-only">{t("Edit")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="admin-product-link"
                      >
                        {p.name}
                      </Link>
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
                    <td>
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="admin-edit-link"
                      > {t("Edit →")} </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <p className="admin-empty">{t("No products match these filters.")}</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
