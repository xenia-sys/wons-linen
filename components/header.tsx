"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useBag } from "./cart-provider";
import { AccountIcon, BagIcon, SearchIcon } from "./icons";
import { CurrencySelector } from "./currency-selector";
import { storefrontCollections } from "../lib/storefront-navigation";

export function Header({ ordersOpen, menuOutletRef }: {
  ordersOpen: boolean;
  menuOutletRef: (element: HTMLDivElement | null) => void;
}) {
  const pathname = usePathname();
  const { count } = useBag();
  const menu = useRef<HTMLDialogElement>(null);

  useEffect(() => { menu.current?.close(); }, [pathname]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 801px)");
    const closeOnDesktop = () => { if (desktop.matches) menu.current?.close(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  function collectionLinks(onClick?: () => void) {
    return storefrontCollections.map(({ label, href }) => (
      <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={onClick}>{label}</Link>
    ));
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="announcement">
        THE FIRST EDIT <span>—</span> {ordersOpen ? "FREE SHIPPING WITHIN VIETNAM" : "A WONS LINEN PREVIEW"}
      </div>
      <header className="site-header">
        <nav aria-label="Collections" className="main-nav">{collectionLinks()}</nav>
        <button className="mobile-menu-toggle" type="button" aria-label="Open navigation menu"
          aria-haspopup="dialog" aria-controls="mobile-navigation" onClick={() => menu.current?.showModal()}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
        <Link href="/" className="logo" aria-label="WONS home">
          <span className="logo-crop">
            <Image src="/wons-logo.png" alt="WONS Fashion" width={200} height={200} priority />
          </span>
        </Link>
        <div className="header-actions">
          <Link href="/shop#search" className="search-link" aria-label="Search the collection"><SearchIcon /></Link>
          <CurrencySelector />
          <Link href="/bag" className="bag-link" aria-label={`Shopping bag, ${count} ${count === 1 ? "item" : "items"}`}>
            <BagIcon />
            <span className="bag-label">Bag</span>
            <span className="bag-count" aria-hidden="true">{count}</span>
          </Link>
          <Link href="/account" className="account-link" aria-label="My account"
            aria-current={pathname === "/account" ? "page" : undefined}>
            <AccountIcon /><span className="account-label">Account</span>
          </Link>
        </div>
        <dialog id="mobile-navigation" className="mobile-navigation" ref={menu} aria-labelledby="mobile-navigation-title"
          onClick={event => { if (event.target === event.currentTarget) menu.current?.close(); }}>
          <div className="mobile-navigation-inner">
            <div className="mobile-panel-heading">
              <h2 id="mobile-navigation-title">Menu</h2>
              <button type="button" className="mobile-panel-close" aria-label="Close navigation menu" onClick={() => menu.current?.close()}>×</button>
            </div>
            <nav aria-label="Collections" className="mobile-nav-links">{collectionLinks(() => menu.current?.close())}</nav>
            <div className="mobile-menu-outlet" ref={menuOutletRef} />
            <div className="mobile-menu-currency"><span>Currency</span><CurrencySelector statusId="mobile-currency-status" /></div>
          </div>
        </dialog>
      </header>
    </>
  );
}
