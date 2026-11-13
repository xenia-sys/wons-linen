"use client";

import { useAdminLanguage } from "./admin-language";
import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "../../lib/admin-browser";
import { money } from "../../lib/commerce";
import { addressLines, COD_LABEL, orderReference, type OrderStatus, type OrderSummary, type StoredOrder } from "../../lib/orders";
import { notifyOrdersChanged, useOrderRefresh } from "./order-inbox";
import { StartCodTest } from "./start-cod-test";

const statusLabels: Record<OrderStatus, string> = {
  pending: "Awaiting confirmation", confirmed: "Confirmed", cancelled: "Cancelled",
};

export function AdminOrders() {
  const { t, errorText, dateLocale } = useAdminLanguage();
  const date = new Intl.DateTimeFormat(dateLocale, { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "medium", timeStyle: "short" });
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [before, setBefore] = useState<number | null>(null);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [detail, setDetail] = useState<StoredOrder | null>(null);
  const [detailError, setDetailError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const detailTitle = useRef<HTMLHeadingElement>(null);
  const opening = useRef<AbortController>(null);
  const load = useCallback(async (signal: AbortSignal) => {
    try {
      const result = await adminFetch(before ? `/orders?before=${before}` : "/orders", { signal });
      if (signal.aborted) return;
      setOrders(result.orders);
      setNext(result.before ?? null);
      setListError("");
    } catch {
      if (!signal.aborted) setListError("Orders could not be loaded. Try refreshing the list.");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [before]);
  useOrderRefresh(load);
  useEffect(() => () => opening.current?.abort(), []);

  function navigate(cursor: number | null) {
    setLoading(true);
    setBefore(cursor);
  }

  async function openOrder(id: string) {
    opening.current?.abort();
    const controller = new AbortController();
    opening.current = controller;
    setBusy(true);
    setDetailError("");
    setCancelConfirm(false);
    try {
      const { order }: { order: StoredOrder } = await adminFetch(`/orders?id=${id}`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setDetail(order);
      requestAnimationFrame(() => detailTitle.current?.focus());
      if (!order.seen_at) {
        await adminFetch("/orders", { method: "PATCH", body: JSON.stringify({ id, action: "seen" }), signal: controller.signal });
        notifyOrdersChanged();
      }
    } catch (error) {
      if (!controller.signal.aborted) setDetailError(error instanceof Error ? error.message : "Could not open the order.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function changeStatus(action: "confirm" | "cancel") {
    if (!detail || busy) return;
    setBusy(true);
    setDetailError("");
    try {
      const { status } = await adminFetch("/orders", { method: "PATCH", body: JSON.stringify({ id: detail.id, action }) });
      setDetail({ ...detail, status });
      setCancelConfirm(false);
      notifyOrdersChanged();
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Could not update the order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="admin-order-heading">
        <p className="eyebrow">{t("STORE OPERATIONS")}</p>
        <h1>{t("Orders")}</h1>
        <p>{t("New orders appear automatically while this workspace is open. Confirm real orders with the customer and collect cash on delivery.")}</p>
        <div className="admin-actions">
          <StartCodTest />
          <span>{t("Use a sample item and sample details. Test orders do not change stock.")}</span>
        </div>
      </header>
      <section className="admin-panel" aria-label={t("Order inbox")}>
        <div className="admin-panel-heading">
          <h2>{before ? t("Earlier orders") : t("Order inbox")}</h2>
          <button type="button" onClick={notifyOrdersChanged}>{t("Refresh")}</button>
        </div>
        {listError && <p role="alert">{errorText(listError)}</p>}
        {loading ? <p role="status">{t("Loading orders…")}</p> : !orders.length && !listError ? <p>{t("No orders received yet.")}</p> : orders.length ? (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead><tr><th>{t("Order")}</th><th>{t("Received (Vietnam time)")}</th><th>{t("Status")}</th><th>{t("Items")}</th><th>{t("Total")}</th></tr></thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td><button type="button" className="admin-order-link" disabled={busy} onClick={() => void openOrder(order.id)}>{orderReference(order.order_number)}</button>
                      {!order.seen_at && <span className="admin-order-new">{t("New")}</span>}</td>
                    <td>{date.format(new Date(order.created_at))}</td>
                    <td>{t(statusLabels[order.status])}{order.is_test && <span className="admin-order-new">{t("Test")}</span>}</td>
                    <td>{order.item_count}</td>
                    <td>{money(order.total_vnd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="admin-actions">
          {before && <button type="button" onClick={() => navigate(null)}>{t("Newest orders")}</button>}
          {next && <button type="button" onClick={() => navigate(next)}>{t("Earlier orders")}</button>}
        </div>
      </section>
      {detailError && <p role="alert">{errorText(detailError)}</p>}
      {detail && (
        <section className="admin-panel admin-order-detail" aria-labelledby="admin-order-detail">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">{detail.is_test ? t("TEST ORDER ·") : ""} {t(statusLabels[detail.status])}</p>
              <h2 id="admin-order-detail" ref={detailTitle} tabIndex={-1}>{orderReference(detail.order_number)}</h2>
            </div>
            <button type="button" disabled={busy} onClick={() => setDetail(null)}>{t("Close details")}</button>
          </div>
          <dl className="admin-order-addresses">
            <div><dt>{t("Contact")}</dt><dd>{detail.email}</dd><dd>{detail.phone}</dd></div>
            <div><dt>{t("Ship to")}</dt><dd>{addressLines(detail.delivery).map((line, i) => <span key={i}>{line}</span>)}</dd></div>
            <div><dt>{t("Billing address")}</dt><dd>{addressLines(detail.billing).map((line, i) => <span key={i}>{line}</span>)}</dd></div>
            {detail.notes && <div><dt>{t("Order notes")}</dt><dd>{detail.notes}</dd></div>}
          </dl>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead><tr><th>{t("Product")}</th><th>{t("Variant")}</th><th>{t("Quantity")}</th><th>{t("Subtotal")}</th></tr></thead>
              <tbody>{detail.lines.map(line => (
                <tr key={line.variantId}><td>{line.name}<small>{line.sku}</small></td><td>{line.color} / {line.size}</td><td>{line.quantity}</td><td>{money(line.quantity * line.price)}</td></tr>
              ))}</tbody>
            </table>
          </div>
          {detail.is_test && <p role="note"><strong>{t("Test order. Do not ship or collect payment.")}</strong></p>}
          <p className="admin-order-total"><strong>{money(detail.total_vnd)}</strong> · {t(COD_LABEL)} {t("· Free shipping · Taxes included.")}</p>
          {detail.status !== "cancelled" && (
            <div className="admin-actions">
              {detail.status === "pending" && <button type="button" className="button dark" disabled={busy || cancelConfirm} onClick={() => void changeStatus("confirm")}>{t("Confirm order")}</button>}
              {cancelConfirm ? <>
                <p>{detail.is_test ? t("Cancel this test order?") : t("Cancel this order and return the reserved items to stock?")}</p>
                <button type="button" disabled={busy} onClick={() => void changeStatus("cancel")}>{t("Yes, cancel order")}</button>
                <button type="button" disabled={busy} onClick={() => setCancelConfirm(false)}>{t("Keep order")}</button>
              </> : <button type="button" disabled={busy} onClick={() => setCancelConfirm(true)}>{t("Cancel order")}</button>}
            </div>
          )}
        </section>
      )}
    </>
  );
}
