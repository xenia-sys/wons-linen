"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { filterProducts } from "../lib/commerce";
import type { Department, Product } from "../lib/types";
import { ProductCard } from "./product-card";
import { SearchIcon } from "./icons";
import { useMobileMenuOutlet } from "./mobile-menu-outlet";
export function Catalog({
  products,
  department = "All",
  collection,
  preview = false,
}: {
  products: Product[];
  department?: Department | "All";
  collection?: "new-arrivals";
  preview?: boolean;
}) {
  const newArrivals = collection === "new-arrivals";
  const [arrivalDepartment, setArrivalDepartment] = useState<Department | "All">("All");
  const currentDepartment = newArrivals ? arrivalDepartment : department;
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("featured");
  const menuOutlet = useMobileMenuOutlet();
  const hasRefinements = category !== "All" || arrivalDepartment !== "All" || sort !== "featured";
  const categories = [
    ...new Set(
      products
        .filter((p) => currentDepartment === "All" || p.department === currentDepartment)
        .map((p) => p.category),
    ),
  ];
  const filtered = filterProducts(products, currentDepartment, category, query, sort);
  const hasFilters = hasRefinements || query.length > 0;
  const resultLabel = `${filtered.length} ${filtered.length === 1 ? "style" : "styles"}`;
  function clearRefinements() {
    setArrivalDepartment("All");
    setCategory("All");
    setSort("featured");
  }
  function clearFilters() {
    clearRefinements();
    setQuery("");
  }
  function selectDepartment(option: Department | "All") {
    setArrivalDepartment(option);
    setCategory("All");
  }
  const sortOptions = <>
    <option value="featured">{newArrivals ? "Featured, then newest" : "Featured"}</option>
    <option value="price-asc">Price: low to high</option>
    <option value="price-desc">Price: high to low</option>
  </>;
  return (
    <section className="catalog-section" aria-label="Collection products">
      {newArrivals && preview && <p className="arrival-preview" role="note">Collection preview · Sample prices</p>}
      {newArrivals ? (
        <div className="catalog-departments" role="group" aria-label="Filter new arrivals by department">
          {(["All", "Women", "Men"] as const).map(option => (
            <button key={option} type="button" aria-pressed={arrivalDepartment === option}
              onClick={() => selectDepartment(option)}>
              {option === "All" ? "All new arrivals" : option}
            </button>
          ))}
        </div>
      ) : <div className="catalog-departments">
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
      </div>}
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
            {sortOptions}
          </select>
        </label>
      </div>
      {menuOutlet && createPortal(
        <section className="mobile-menu-refinements" aria-labelledby="mobile-filter-title">
          <div className="mobile-filter-title">
            <h3 id="mobile-filter-title">Filter and sort</h3>
            <p role="status">{resultLabel}</p>
          </div>
          {newArrivals && (
            <label>Department
              <select value={arrivalDepartment} onChange={event => selectDepartment(event.target.value as Department | "All")}>
                <option value="All">All new arrivals</option>
                <option value="Women">Women</option>
                <option value="Men">Men</option>
              </select>
            </label>
          )}
          <label>Category
            <select value={category} onChange={event => setCategory(event.target.value)}>
              {["All", ...categories].map(value => <option value={value} key={value}>{value === "All" ? "All categories" : value}</option>)}
            </select>
          </label>
          <label>Sort by
            <select value={sort} onChange={event => setSort(event.target.value)}>{sortOptions}</select>
          </label>
          <div className="mobile-filter-actions">
            <button type="button" className="text-button" disabled={!hasRefinements} onClick={clearRefinements}>Reset</button>
            <button type="button" className="button dark" onClick={() => menuOutlet.closest("dialog")?.close()}>Show {resultLabel}</button>
          </div>
        </section>,
        menuOutlet,
      )}
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
          {resultLabel}
          {query && ` for “${query}”`}
        </span>
        {hasFilters && (
          <button
            className="text-button desktop-clear-filters"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        )}
        {query && <button type="button" className="text-button mobile-clear-search" onClick={() => setQuery("")}>Clear search</button>}
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
          <h2>{newArrivals && !products.length ? "More styles are on the way." : "No styles found."}</h2>
          <p>{newArrivals && !products.length ? "Explore the WONS collection while you wait." : "Try another search or clear your filters."}</p>
          {hasFilters ? <button className="button dark desktop-clear-filters" onClick={clearFilters}>Clear filters</button>
            : <Link className="button dark" href="/shop">Shop all styles</Link>}
        </div>
      )}
      {!newArrivals && <p className="catalog-note">
        A first look at WONS. Styles, colours and prices are illustrative;
        product photography will follow.
      </p>}
    </section>
  );
}
