"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { adminFetch } from "../../lib/admin-browser";
import { money, percentagePrice } from "../../lib/commerce";
import { discountEventStatus, parseDiscountEvent, vietnamDateTime, VIETNAM_TIME_ZONE, type DiscountEvent } from "../../lib/discount-events";

type EventProduct = { id: string; name: string; department: string; status: string; price_vnd: number | null };
type EventDraft = Omit<DiscountEvent, "id"> & { id?: string };

const formatDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: VIETNAM_TIME_ZONE });
function newDraft(now: number): EventDraft {
  return { name: "", percent_off: 0, starts_at: vietnamDateTime(new Date(now).toISOString()),
    ends_at: vietnamDateTime(new Date(now + 7 * 86400000).toISOString()), enabled: true, product_ids: [] };
}

export function DiscountEvents() {
  const [events, setEvents] = useState<DiscountEvent[] | null>(null);
  const [products, setProducts] = useState<EventProduct[]>([]);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const formTitle = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void adminFetch("/discount-events", { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      setEvents(result.events);
      setProducts(result.products);
      setNow(Date.now());
    }).catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not load discount events.");
    });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  function openEditor(event?: DiscountEvent) {
    setDraft(event ? { ...event, starts_at: vietnamDateTime(event.starts_at), ends_at: vietnamDateTime(event.ends_at) } : newDraft(Date.now()));
    setQuery("");
    setError("");
    setNotice("");
    requestAnimationFrame(() => formTitle.current?.focus());
  }

  function change(next: Partial<EventDraft>) {
    setDraft(previous => previous ? { ...previous, ...next } : null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || saving) return;
    setError("");
    setNotice("");
    setSaving(true);
    try {
      parseDiscountEvent(draft);
      const result = await adminFetch("/discount-events", { method: "POST", body: JSON.stringify(draft) });
      const updated: DiscountEvent = result.event;
      setEvents(previous => [...(previous ?? []).filter(event => event.id !== updated.id), updated]
        .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at)));
      setNow(Date.now());
      setDraft(null);
      setNotice(updated.enabled ? "Discount event saved." : "Discount event saved and paused.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save this discount event.");
    } finally {
      setSaving(false);
    }
  }

  const matching = products.filter(product => `${product.name} ${product.department}`.toLowerCase().includes(query.trim().toLowerCase()));
  const eventPricePreview = draft && Number.isInteger(draft.percent_off) && draft.percent_off >= 1 && draft.percent_off <= 99;
  return <>
    <div className="admin-page-heading">
      <div><p className="eyebrow">STORE OPERATIONS</p><h1>Discount events</h1>
        <p>Schedule a percentage off selected products. Prices update automatically when an event starts or ends.</p></div>
      <button type="button" className="button dark" disabled={!events || !!draft} onClick={() => openEditor()}>+ New discount event</button>
    </div>
    {notice && <p role="status" className="admin-feedback">{notice}</p>}
    {!events && (error
      ? <section className="admin-panel"><p role="alert" className="admin-error">{error}</p><button type="button" onClick={() => { setError(""); setReload(value => value + 1); }}>Try again</button></section>
      : <p role="status">Loading discount events…</p>)}
    {draft && <form className="admin-panel admin-discount-editor" onSubmit={save}>
      <h2 ref={formTitle} tabIndex={-1}>{draft.id ? "Edit discount event" : "New discount event"}</h2>
      <fieldset disabled={saving}>
        <div className="admin-form-grid">
          <label>Event name<input required maxLength={100} value={draft.name} onChange={event => change({ name: event.target.value })} /></label>
          <label>Discount (%)<input required type="number" min={1} max={99} step={1} value={draft.percent_off || ""} onChange={event => change({ percent_off: Number(event.target.value) })} /></label>
          <label>Starts (Vietnam time)<input required type="datetime-local" value={draft.starts_at} onChange={event => change({ starts_at: event.target.value })} /></label>
          <label>Ends (Vietnam time)<input required type="datetime-local" value={draft.ends_at} onChange={event => change({ ends_at: event.target.value })} /></label>
        </div>
        <label className="admin-checkbox admin-discount-enabled"><input type="checkbox" checked={draft.enabled} onChange={event => change({ enabled: event.target.checked })} /> Enable this event</label>
        <p className="admin-help">Times are in Vietnam (UTC+7). If events overlap, the highest discount applies. Hidden products remain hidden.</p>
        <fieldset className="admin-discount-picker">
          <legend>Products</legend>
          <label>Find a product<input type="search" value={query} placeholder="Search product or department" onChange={event => setQuery(event.target.value)} /></label>
          <p role="status" className="admin-help">{draft.product_ids.length} selected · Prices below use each product’s lowest regular variant price.</p>
          <ul>
            {matching.map(product => {
              const selected = draft.product_ids.includes(product.id);
              return <li key={product.id}>
                <label className="admin-checkbox">
                  <input type="checkbox" checked={selected} onChange={() => change({ product_ids: selected ? draft.product_ids.filter(id => id !== product.id) : [...draft.product_ids, product.id] })} />
                  <span><strong>{product.name}</strong><small>{product.department} · {product.status}</small></span>
                </label>
                {product.price_vnd !== null && <span className="admin-discount-preview">
                  {selected && eventPricePreview ? <><del>{money(product.price_vnd)}</del> <strong>{money(percentagePrice(product.price_vnd, draft.percent_off))}</strong></> : money(product.price_vnd)}
                </span>}
              </li>;
            })}
          </ul>
          {!matching.length && <p className="admin-help">{products.length ? "No products match your search." : "Add a product in Products before creating an event."}</p>}
        </fieldset>
        {error && <p role="alert" className="admin-error">{error}</p>}
        <div className="admin-actions">
          <button className="button dark" type="submit" disabled={saving || !draft.product_ids.length}>{saving ? "Saving…" : "Save event"}</button>
          <button type="button" onClick={() => { setDraft(null); setError(""); }}>Cancel</button>
        </div>
      </fieldset>
    </form>}
    {events && <section aria-label="Event schedule">
      {events.length === 0 ? <div className="admin-panel"><h2>No discount events yet</h2><p>Create an event to schedule a promotion for one or more products.</p></div>
        : <div className="admin-discount-cards">{events.map(event => <article key={event.id} className="admin-panel admin-discount-card">
          <div className="admin-discount-card-top"><span className="admin-badge">{discountEventStatus(event, now)}</span><strong>{event.percent_off}% off</strong></div>
          <h2>{event.name}</h2>
          <p>{event.product_ids.length} {event.product_ids.length === 1 ? "product" : "products"}</p>
          <p><time dateTime={event.starts_at}>{formatDate.format(new Date(event.starts_at))}</time> – <time dateTime={event.ends_at}>{formatDate.format(new Date(event.ends_at))}</time><small>Vietnam time</small></p>
          <button type="button" disabled={!!draft} onClick={() => openEditor(event)}>Edit event</button>
        </article>)}</div>}
    </section>}
  </>;
}
