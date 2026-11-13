"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { filterProducts } from "../lib/commerce";
import type { Department, Product } from "../lib/types";
import { ProductCard } from "./product-card";
import { SearchIcon } from "./icons";
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
  const filters = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 801px)");
    const closeOnDesktop = () => { if (desktop.matches) filters.current?.close(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  const filterCount = Number(category !== "All") + Number(arrivalDepartment !== "All");
  const categories = [
    ...new Set(
      products
        .filter((p) => currentDepartment === "All" || p.department === currentDepartment)
        .map((p) => p.category),
    ),
  ];
  const filtered = filterProducts(products, currentDepartment, category, query, sort);
  const hasFilters =
    category !== "All" || query.length > 0 || sort !== "featured" || arrivalDepartment !== "All";
  function clearFilters() {
    setArrivalDepartment("All");
    setCategory("All");
    setQuery("");
    setSort("featured");
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
      <div className="mobile-catalog-toolbar">
        <label className="mobile-sort">
          <span className="sr-only">Sort by</span>
          <select value={sort} onChange={event => setSort(event.target.value)}>{sortOptions}</select>
        </label>
        <button type="button" className="mobile-filter-toggle" aria-haspopup="dialog" aria-controls="mobile-catalog-filters"
          onClick={() => filters.current?.showModal()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" /><path d="M8 3v6m8 0v6m-6 0v6" />
          </svg>
          Filter{filterCount > 0 && <span className="mobile-filter-count">{filterCount}</span>}
        </button>
      </div>
      <dialog className="mobile-catalog-filters" id="mobile-catalog-filters" ref={filters} aria-labelledby="mobile-filter-title"
        onClick={event => { if (event.target === event.currentTarget) filters.current?.close(); }}>
        <div className="mobile-filter-inner">
          <div className="mobile-panel-heading">
            <h2 id="mobile-filter-title">Filter styles</h2>
            <button type="button" className="mobile-panel-close" aria-label="Close filters" onClick={() => filters.current?.close()}>×</button>
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
          <div className="mobile-filter-actions">
            <button type="button" className="text-button" disabled={!filterCount} onClick={() => { setArrivalDepartment("All"); setCategory("All"); }}>Reset filters</button>
            <button type="button" className="button dark" onClick={() => filters.current?.close()}>
              Show {filtered.length} {filtered.length === 1 ? "style" : "styles"}
            </button>
          </div>
        </div>
      </dialog>
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
            onClick={clearFilters}
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
          <h2>{newArrivals && !products.length ? "More styles are on the way." : "No styles found."}</h2>
          <p>{newArrivals && !products.length ? "Explore the WONS collection while you wait." : "Try another search or clear your filters."}</p>
          {hasFilters ? <button className="button dark" onClick={clearFilters}>Clear filters</button>
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
