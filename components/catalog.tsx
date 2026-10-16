"use client";
import { useState } from "react";
import Link from "next/link";
import { filterProducts } from "../lib/commerce";
import type { Product } from "../lib/types";
import { ProductCard } from "./product-card";
import { SearchIcon } from "./icons";
export function Catalog({
  products,
  department = "All",
}: {
  products: Product[];
  department?: string;
}) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("featured");
  const categories = [
    ...new Set(
      products
        .filter((p) => department === "All" || p.department === department)
        .map((p) => p.category),
    ),
  ];
  const filtered = filterProducts(products, department, category, query, sort);
  const hasFilters =
    category !== "All" || query.length > 0 || sort !== "featured";
  return (
    <section className="catalog-section" aria-label="Collection products">
      <div className="catalog-departments">
        <Link
          href="/shop"
          aria-current={department === "All" ? "page" : undefined}
        >
          All styles
        </Link>
        <Link
          href="/women"
          aria-current={department === "Women" ? "page" : undefined}
        >
          Women
        </Link>
        <Link
          href="/men"
          aria-current={department === "Men" ? "page" : undefined}
        >
          Men
        </Link>
      </div>
      <div className="catalog-toolbar">
        <div
          className="category-tabs"
          role="group"
          aria-label="Filter by category"
        >
          {["All", ...categories].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
            >
              {c === "All" ? "All categories" : c}
            </button>
          ))}
        </div>
        <label className="sort-label">
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </label>
      </div>
      <div className="catalog-search-row">
        <label className="search-field" htmlFor="search">
          <SearchIcon />
          <input
            id="search"
            aria-label="Search styles or colours"
            type="search"
            placeholder="Search styles or colours"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span className="result-count" role="status">
          {filtered.length} {filtered.length === 1 ? "style" : "styles"}
          {query && ` for “${query}”`}
        </span>
        {hasFilters && (
          <button
            className="text-button"
            onClick={() => {
              setQuery("");
              setCategory("All");
              setSort("featured");
            }}
          >
            Clear filters
          </button>
        )}
      </div>
      {filtered.length ? (
        <div className="product-grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p className="eyebrow">A FRESH START</p>
          <h2>No styles found.</h2>
          <p>Try another search or explore the whole collection.</p>
          <button
            className="button dark"
            onClick={() => {
              setQuery("");
              setCategory("All");
            }}
          >
            View all styles
          </button>
        </div>
      )}
      <p className="catalog-note">
        A first look at WONS. Styles, colours and prices are illustrative;
        product photography will follow.
      </p>
    </section>
  );
}
