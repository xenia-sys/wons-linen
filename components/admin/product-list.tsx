"use client";
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
  category: string;
  status: string;
  is_demo: boolean;
  updated_at: string;
  variants: Variant[];
};
export function ProductList() {
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
      (department === "All" || p.department === department) &&
      `${p.name} ${p.slug}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">THE COLLECTION</p>
          <h1>Products</h1>
          <p>Manage imagery, descriptions, visibility and prices.</p>
        </div>
        <Link href="/admin/products/new" className="button dark">
          + New product
        </Link>
      </div>
      <div className="admin-stat-row">
        <div>
          <strong>{products.length}</strong>
          <span>Total styles</span>
        </div>
        <div>
          <strong>
            {products.filter((p) => p.status === "published").length}
          </strong>
          <span>Published</span>
        </div>
        <div>
          <strong>
            {products.filter((p) => p.status === "hidden").length}
          </strong>
          <span>Hidden</span>
        </div>
      </div>
      <div className="admin-panel">
        <div className="admin-filters">
          <label>
            Search
            <input
              type="search"
              placeholder="Product name or URL"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            Department
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option>All</option>
              <option>Women</option>
              <option>Men</option>
            </select>
          </label>
          <label>
            Visibility
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="All">All</option>
              <option value="published">Published</option>
              <option value="preview">Preview</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
        </div>
        {busy ? (
          <p role="status">Loading products…</p>
        ) : error ? (
          <div role="alert">
            {error}
            <button onClick={load}>Try again</button>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Department</th>
                  <th>Visibility</th>
                  <th>Price from</th>
                  <th>Updated</th>
                  <th>
                    <span className="admin-sr-only">Edit</span>
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
                        {p.category}
                        {p.is_demo ? " · Demo" : ""}
                      </small>
                    </td>
                    <td>{p.department}</td>
                    <td>
                      <span className={`admin-badge status-${p.status}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {p.variants.length
                        ? money(Math.min(...p.variants.map(unitPrice)))
                        : "No variants"}
                    </td>
                    <td>
                      {new Date(p.updated_at).toLocaleDateString("en-GB")}
                    </td>
                    <td>
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="admin-edit-link"
                      >
                        Edit →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <p className="admin-empty">No products match these filters.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
