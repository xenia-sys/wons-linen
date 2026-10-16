"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useBag } from "./cart-provider";
import { BagIcon, SearchIcon } from "./icons";
export function Header() {
  const pathname = usePathname();
  const { count } = useBag();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="announcement">
        THE FIRST EDIT <span>—</span> A WONS LINEN PREVIEW
      </div>
      <header className="site-header">
        <nav aria-label="Collections" className="main-nav">
          {[
            ["Shop All", "/shop"],
            ["Women", "/women"],
            ["Men", "/men"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="logo" aria-label="WONS home">
          <span className="logo-crop">
            <Image
              src="/wons-logo.png"
              alt="WONS Fashion"
              width={200}
              height={200}
              priority
            />
          </span>
        </Link>
        <div className="header-actions">
          <Link
            href="/shop#search"
            className="search-link"
            aria-label="Search the collection"
          >
            <SearchIcon />
          </Link>
          <Link
            href="/bag"
            className="bag-link"
            aria-label={`Shopping bag, ${count} ${count === 1 ? "item" : "items"}`}
          >
            <BagIcon />
            <span className="bag-label">Bag</span>
            <span className="bag-count" aria-live="polite">
              {count}
            </span>
          </Link>
        </div>
      </header>
    </>
  );
}
