"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useBag } from "./cart-provider";
import { AccountIcon, BagIcon, SearchIcon } from "./icons";
import { CurrencySelector } from "./currency-selector";
export function Header({ ordersOpen }: { ordersOpen: boolean }) {
  const pathname = usePathname();
  const { count } = useBag();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="announcement">
        THE FIRST EDIT <span>—</span> {ordersOpen ? "FREE SHIPPING WITHIN VIETNAM" : "A WONS LINEN PREVIEW"}
      </div>
      <header className="site-header">
        <nav aria-label="Collections" className="main-nav">
          {[
            ["New Arrivals", "/new-arrivals"],
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
          <CurrencySelector />
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
          <Link href="/account" className="account-link" aria-label="My account"
            aria-current={pathname === "/account" ? "page" : undefined}>
            <AccountIcon />
            <span className="account-label">Account</span>
          </Link>
        </div>
      </header>
    </>
  );
}
