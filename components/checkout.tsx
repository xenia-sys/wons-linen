"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { money, subtotal, unitPrice } from "../lib/commerce";
import { addressLines, ORDER_COUNTRY, orderReference, type OrderAddress, type OrderDetails, type OrderItem, type OrderReceipt } from "../lib/orders";
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
  max?: number;
};

const contactFields: Field[] = [
  { key: "email", label: "Email address", type: "email" },
  { key: "phone", label: "Phone number", type: "tel" },
];

const addressFields: Field[] = [
  { key: "first-name", label: "First name", max: 80 },
  { key: "last-name", label: "Last name", max: 80 },
  { key: "street", label: "Street address", wide: true },
  { key: "unit", label: "Apartment, suite, etc.", wide: true, optional: true },
  { key: "city", label: "Town / city", max: 100 },
  { key: "province", label: "State / province", optional: true, max: 100 },
  { key: "postcode", label: "Postal code", optional: true, max: 20 },
];

function Fields({ prefix, fields }: { prefix: string; fields: Field[] }) {
  return (
    <div className="checkout-field-grid">
      {fields.map(({ key, label, type, wide, optional, max }) => {
        const id = `checkout-${prefix}-${key}`;
        return (
          <div key={key} className={wide ? "checkout-field checkout-wide" : "checkout-field"}>
            <label htmlFor={id}>
              {label} {optional && <span>(optional)</span>}
            </label>
            <input id={id} type={type ?? "text"} required={!optional} maxLength={max ?? (type === "tel" ? 40 : 160)} />
          </div>
        );
      })}
    </div>
  );
}

function AddressFields({ prefix }: { prefix: string }) {
  return (
    <>
      <Fields prefix={prefix} fields={addressFields} />
      <p className="checkout-country"><strong>Country / region:</strong> {ORDER_COUNTRY}</p>
    </>
  );
}

function getAddress(read: (field: string) => string, prefix: string): OrderAddress {
  const value = (field: string) => read(`${prefix}-${field}`);
  return {
    firstName: value("first-name"), lastName: value("last-name"), street: value("street"),
    unit: value("unit"), city: value("city"), province: value("province"),
    postcode: value("postcode"), country: ORDER_COUNTRY,
  };
}

type Review = OrderDetails & { items: OrderItem[]; separateDelivery: boolean };

function OrderSummary({
  reviewing, canOrder, changed, placing, error, place,
}: {
  reviewing: boolean; canOrder: boolean; changed: boolean; placing: boolean;
  error: { message: string; code?: string } | null; place: () => void;
}) {
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
        <div><dt>Delivery</dt><dd>Free shipping</dd></div>
        <div><dt>Taxes &amp; fees</dt><dd>Included in product prices</dd></div>
        <div className="checkout-total"><dt>Order total</dt><dd>{format(subtotal(lines))}</dd></div>
      </dl>
      {currency === "USD" && <p className="checkout-subtle">Orders are recorded in VND ({money(subtotal(lines))}). USD amounts are estimates.</p>}
      {error && <p className="checkout-summary-notice" role="alert">{error.message} {error.code === "BAG_CHANGED" && <a href="/bag" className="underlined-link">Refresh bag</a>}</p>}
      {reviewing ? canOrder ? (
        <>
          {changed && <p className="checkout-summary-notice" role="alert">Your bag changed. Edit your details and review the updated order.</p>}
          <button className="button dark checkout-review-button" type="button" onClick={place} disabled={placing || changed}>
            {placing ? "Placing order…" : "Place order"} <Arrow />
          </button>
        </>
      ) : (
        <>
          <button className="button dark checkout-review-button" type="button" disabled aria-describedby="preview-order-unavailable">
            Place order <Arrow />
          </button>
          <p className="checkout-subtle" id="preview-order-unavailable">Preview only. These items cannot be ordered.</p>
        </>
      ) : (
        <button className="button dark checkout-review-button" type="submit" form={FORM_ID}>
          Review order <Arrow />
        </button>
      )}
      <p className="checkout-subtle checkout-payment-note">{canOrder ? "No payment is taken here. WONS will contact you to confirm." : "Preview items are not available to order."}</p>
    </aside>
  );
}

function GuestCheckout({ canOrder, complete }: { canOrder: boolean; complete: (receipt: OrderReceipt, items: OrderItem[]) => void }) {
  const { lines } = useBag();
  const items = lines.map(line => ({ variantId: line.variantId, quantity: line.quantity, price: unitPrice(line.variant) }));
  const [separateDelivery, setSeparateDelivery] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const requestId = useRef<string>(null);
  const inFlight = useRef(false);
  const reviewTitle = useRef<HTMLHeadingElement>(null);
  const editTarget = useRef<HTMLFormElement>(null);
  const changed = Boolean(review && JSON.stringify(review.items) !== JSON.stringify(items));

  useEffect(() => {
    if (review) reviewTitle.current?.focus();
  }, [review]);

  function reviewOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    // Do not let native form submission include customer information.
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
    const billing = getAddress(read, "billing");
    setError(null);
    setReview({
      email: read("contact-email"), phone: read("contact-phone"),
      billing, delivery: separateDelivery ? getAddress(read, "delivery") : billing,
      separateDelivery, notes: read("notes"), items,
    });
  }

  function editDetails() {
    setReview(null);
    setError(null);
    requestAnimationFrame(() => editTarget.current?.querySelector("input")?.focus());
  }

  async function placeOrder() {
    if (!canOrder || !review || changed || inFlight.current) return;
    inFlight.current = true;
    setPlacing(true);
    setError(null);
    try {
      requestId.current ??= crypto.randomUUID();
      const { separateDelivery: _separateDelivery, ...details } = review;
      const response = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId.current, ...details }),
        signal: AbortSignal.timeout(18000),
      });
      const result = await response.json();
      if (!response.ok) {
        setError({ message: result.message ?? "We could not confirm your order.", code: result.code });
        return;
      }
      complete(result, review.items);
    } catch {
      setError({ message: "We could not confirm your order yet. Retry here with the same details to avoid a duplicate." });
    } finally {
      inFlight.current = false;
      setPlacing(false);
    }
  }

  return (
    <div className="checkout-layout">
      <div className="checkout-main">
        <form ref={editTarget} id={FORM_ID} autoComplete={canOrder ? "on" : "off"} hidden={review !== null} onSubmit={reviewOrder}>
          <fieldset className="checkout-section">
            <legend>Contact details</legend>
            <p className="checkout-subtle">You can check out as a guest. No account is needed.</p>
            <Fields prefix="contact" fields={contactFields} />
          </fieldset>
          <fieldset className="checkout-section">
            <legend>Billing address</legend>
            <AddressFields prefix="billing" />
          </fieldset>
          <fieldset className="checkout-section">
            <legend>Delivery address</legend>
            <label className="checkout-checkbox">
              <input
                type="checkbox"
                checked={separateDelivery}
                onChange={(event) => setSeparateDelivery(event.target.checked)}
              />
              Ship to a different address?
            </label>
            {separateDelivery ? (
              <AddressFields prefix="delivery" />
            ) : (
              <p className="checkout-subtle">Same as the billing address.</p>
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
              <button type="button" className="underlined-link checkout-edit" onClick={editDetails} disabled={placing}>Edit details</button>
            </div>
            <dl>
              <div><dt>Contact details</dt><dd>{review.email} · {review.phone}</dd></div>
              <div>
                <dt>Billing address</dt>
                <dd>{addressLines(review.billing).map((line, index) => <span key={index}>{line}</span>)}</dd>
              </div>
              <div>
                <dt>Delivery address</dt>
                <dd>{review.separateDelivery ? addressLines(review.delivery).map((line, index) => <span key={index}>{line}</span>) : "Same as the billing address."}</dd>
              </div>
              {review.notes && <div><dt>Order notes</dt><dd>{review.notes}</dd></div>}
            </dl>
          </section>
        )}
        <section className="checkout-payment" aria-labelledby="checkout-payment-title">
          <h2 id="checkout-payment-title">Payment</h2>
          <p className="checkout-subtle">{canOrder ? "WONS will contact you to confirm your order and arrange payment. No payment is collected on this page." : "No payment is collected in this preview."}</p>
          <Link className="underlined-link" href="/information/privacy">Privacy information</Link>
        </section>
      </div>
      <OrderSummary reviewing={review !== null} canOrder={canOrder} changed={changed} placing={placing} error={error} place={placeOrder} />
    </div>
  );
}

export function Checkout({ enabled }: { enabled: boolean }) {
  const { ready, lines, consume } = useBag();
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const receiptTitle = useRef<HTMLHeadingElement>(null);
  const canOrder = enabled && lines.length > 0 && lines.every(line => line.product.status === "published" && !line.product.is_demo);
  useEffect(() => {
    if (receipt) receiptTitle.current?.focus();
  }, [receipt]);
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
      {receipt ? (
        <section className="checkout-empty" aria-labelledby="checkout-receipt">
          <BagIcon />
          <h2 id="checkout-receipt" tabIndex={-1} ref={receiptTitle}>Order received.</h2>
          <p><strong>{orderReference(receipt.order_number)}</strong> · {money(receipt.total_vnd)}</p>
          <p>WONS will contact you to confirm. No payment has been taken.</p>
          <Link href="/shop" className="button dark">Continue exploring <Arrow /></Link>
        </section>
      ) : !ready ? (
        <p className="checkout-loading" role="status">Loading your bag…</p>
      ) : !lines.length ? (
        <div className="checkout-empty">
          <BagIcon />
          <h2>Your bag is empty.</h2>
          <p>Add an item to your bag to continue.</p>
          <Link href="/shop" className="button dark">Explore the collection <Arrow /></Link>
        </div>
      ) : (
        <>
          <div className="checkout-preview-notice">
            <strong>{canOrder ? "Delivery within Vietnam" : "Checkout preview"}</strong>
            <p>{canOrder ? "Free shipping. Review your details before placing your order." : "Use sample details only. Nothing you enter here is sent to WONS or saved by the site."}</p>
          </div>
          <GuestCheckout canOrder={canOrder} complete={(order, items) => {
            setReceipt(order);
            consume(items);
          }} />
        </>
      )}
    </section>
  );
}
