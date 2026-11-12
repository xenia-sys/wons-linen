"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { subtotal, unitPrice } from "../lib/commerce";
import { useBag } from "./cart-provider";
import { useDisplayCurrency } from "./display-currency-provider";
import { GarmentArt } from "./garment-art";
import { Arrow, BagIcon } from "./icons";

const FORM_ID = "checkout-details";

type Field = {
  key: string;
  label: string;
  type?: "email" | "tel";
  wide?: boolean;
  optional?: boolean;
};

const contactFields: Field[] = [
  { key: "email", label: "Email address", type: "email" },
  { key: "phone", label: "Phone number", type: "tel" },
];

const addressFields: Field[] = [
  { key: "first-name", label: "First name" },
  { key: "last-name", label: "Last name" },
  { key: "country", label: "Country / region", wide: true },
  { key: "street", label: "Street address", wide: true },
  { key: "unit", label: "Apartment, suite, etc.", wide: true, optional: true },
  { key: "city", label: "Town / city" },
  { key: "province", label: "State / province", optional: true },
  { key: "postcode", label: "Postal code", optional: true },
];

function Fields({ prefix, fields }: { prefix: string; fields: Field[] }) {
  return (
    <div className="checkout-field-grid">
      {fields.map(({ key, label, type, wide, optional }) => {
        const id = `checkout-${prefix}-${key}`;
        return (
          <div key={key} className={wide ? "checkout-field checkout-wide" : "checkout-field"}>
            <label htmlFor={id}>
              {label} {optional && <span>(optional)</span>}
            </label>
            <input id={id} type={type ?? "text"} required={!optional} maxLength={type === "tel" ? 40 : 160} />
          </div>
        );
      })}
    </div>
  );
}

function addressLines(read: (field: string) => string, prefix: string) {
  const value = (field: string) => read(`${prefix}-${field}`);
  return [
    [value("first-name"), value("last-name")].filter(Boolean).join(" "),
    value("street"),
    value("unit"),
    [value("city"), value("province"), value("postcode")].filter(Boolean).join(", "),
    value("country"),
  ].filter(Boolean);
}

type Review = {
  contact: string[];
  delivery: string[];
  billing: string[];
  notes: string;
};

function OrderSummary({ reviewing }: { reviewing: boolean }) {
  const { lines, count } = useBag();
  const { currency, format } = useDisplayCurrency();
  return (
    <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
      <div className="checkout-summary-heading">
        <h2 id="checkout-summary-title">Your order</h2>
        <Link href="/bag" className="underlined-link">Edit bag</Link>
      </div>
      <p className="checkout-subtle">{count} {count === 1 ? "item" : "items"} in your bag</p>
      <ul className="checkout-items">
        {lines.map(({ variantId, product, variant, quantity }) => {
          const cover =
            product.images?.find((image) => image.color === variant.color) ??
            product.images?.find((image) => !image.color);
          return (
            <li key={variantId} className="checkout-item">
              <div className="checkout-thumbnail">
                {cover ? (
                  <Image src={cover.src} alt="" width={128} height={160} />
                ) : (
                  <GarmentArt category={product.category} color={variant.color_hex} />
                )}
              </div>
              <div className="checkout-item-details">
                <p>{product.name}</p>
                <p className="checkout-subtle">{variant.color} / Size {variant.size}</p>
                <p className="checkout-subtle">Qty {quantity}</p>
              </div>
              <strong className="checkout-item-amount">{format(unitPrice(variant) * quantity)}</strong>
            </li>
          );
        })}
      </ul>
      <dl className="checkout-totals">
        <div><dt>Subtotal</dt><dd>{format(subtotal(lines))}</dd></div>
        <div><dt>Delivery</dt><dd>To be confirmed</dd></div>
        <div><dt>Taxes &amp; fees</dt><dd>To be confirmed</dd></div>
        <div className="checkout-total"><dt>Order total</dt><dd>To be confirmed</dd></div>
      </dl>
      {currency === "USD" && <p className="checkout-subtle">USD amounts are estimates converted from VND.</p>}
      {reviewing ? (
        <p className="checkout-summary-notice" role="status">
          Preview only. No order has been placed and no payment has been taken.
        </p>
      ) : (
        <button className="button dark checkout-review-button" type="submit" form={FORM_ID}>
          Review order <Arrow />
        </button>
      )}
      <p className="checkout-subtle checkout-payment-note">Orders and payments open when the collection launches.</p>
    </aside>
  );
}

function GuestCheckout() {
  const [separateBilling, setSeparateBilling] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const reviewTitle = useRef<HTMLHeadingElement>(null);
  const editTarget = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (review) reviewTitle.current?.focus();
  }, [review]);

  function reviewOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    // These fields have IDs for local validation and no submission names.
    const read = (key: string) => {
      const field = form.elements.namedItem(`checkout-${key}`);
      return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
        ? field.value.trim()
        : "";
    };
    for (const field of Array.from(form.elements)) {
      if (field instanceof HTMLInputElement && field.required && !field.value.trim()) {
        field.value = "";
        form.reportValidity();
        return;
      }
    }
    setReview({
      contact: [read("contact-email"), read("contact-phone")],
      delivery: addressLines(read, "delivery"),
      billing: separateBilling ? addressLines(read, "billing") : [],
      notes: read("notes"),
    });
  }

  function editDetails() {
    setReview(null);
    requestAnimationFrame(() => editTarget.current?.querySelector("input")?.focus());
  }

  return (
    <div className="checkout-layout">
      <div className="checkout-main">
        <form ref={editTarget} id={FORM_ID} autoComplete="off" hidden={review !== null} onSubmit={reviewOrder}>
          <fieldset className="checkout-section">
            <legend>Contact details</legend>
            <p className="checkout-subtle">You can check out as a guest. No account is needed.</p>
            <Fields prefix="contact" fields={contactFields} />
          </fieldset>
          <fieldset className="checkout-section">
            <legend>Delivery address</legend>
            <Fields prefix="delivery" fields={addressFields} />
          </fieldset>
          <fieldset className="checkout-section">
            <legend>Billing address</legend>
            <label className="checkout-checkbox">
              <input
                type="checkbox"
                checked={separateBilling}
                onChange={(event) => setSeparateBilling(event.target.checked)}
              />
              Use a different billing address
            </label>
            {separateBilling ? (
              <Fields prefix="billing" fields={addressFields} />
            ) : (
              <p className="checkout-subtle">Same as the delivery address.</p>
            )}
          </fieldset>
          <fieldset className="checkout-section">
            <legend>Order notes</legend>
            <div className="checkout-field">
              <label htmlFor="checkout-notes">Delivery instructions <span>(optional)</span></label>
              <textarea id="checkout-notes" rows={3} maxLength={500} />
            </div>
          </fieldset>
        </form>
        {review && (
          <section className="checkout-details-review" aria-labelledby="checkout-review-title">
            <div className="checkout-summary-heading">
              <h2 id="checkout-review-title" ref={reviewTitle} tabIndex={-1}>Review your details</h2>
              <button type="button" className="underlined-link checkout-edit" onClick={editDetails}>Edit details</button>
            </div>
            <dl>
              <div><dt>Contact details</dt><dd>{review.contact.join(" · ")}</dd></div>
              <div>
                <dt>Delivery address</dt>
                <dd>{review.delivery.map((line, index) => <span key={index}>{line}</span>)}</dd>
              </div>
              <div>
                <dt>Billing address</dt>
                <dd>{review.billing.length ? review.billing.map((line, index) => <span key={index}>{line}</span>) : "Same as the delivery address."}</dd>
              </div>
              {review.notes && <div><dt>Order notes</dt><dd>{review.notes}</dd></div>}
            </dl>
          </section>
        )}
        <section className="checkout-payment" aria-labelledby="checkout-payment-title">
          <h2 id="checkout-payment-title">Payment</h2>
          <p className="checkout-subtle">Payment options will be available when orders open.</p>
          <Link className="underlined-link" href="/information/privacy">Privacy information</Link>
        </section>
      </div>
      <OrderSummary reviewing={review !== null} />
    </div>
  );
}

export function Checkout() {
  const { ready, lines } = useBag();
  return (
    <section className="checkout-page" aria-labelledby="checkout-title">
      <header className="checkout-header">
        <nav aria-label="Checkout steps" className="checkout-steps">
          <Link href="/bag">Bag</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="step">Checkout</span>
        </nav>
        <h1 id="checkout-title">Checkout</h1>
      </header>
      {!ready ? (
        <p className="checkout-loading" role="status">Loading your bag…</p>
      ) : !lines.length ? (
        <div className="checkout-empty">
          <BagIcon />
          <h2>Your bag is empty.</h2>
          <p>Add an item to your bag to preview checkout.</p>
          <Link href="/shop" className="button dark">Explore the collection <Arrow /></Link>
        </div>
      ) : (
        <>
          <div className="checkout-preview-notice">
            <strong>Checkout preview</strong>
            <p>Use sample details only. Nothing you enter here is sent to WONS or saved by the site.</p>
          </div>
          <GuestCheckout />
        </>
      )}
    </section>
  );
}
