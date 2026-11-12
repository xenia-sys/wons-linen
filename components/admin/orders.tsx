"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "../../lib/admin-browser";
import { money } from "../../lib/commerce";
import { addressLines, orderReference, type OrderStatus, type OrderSummary, type StoredOrder } from "../../lib/orders";
import { notifyOrdersChanged, useOrderRefresh } from "./order-inbox";

const statusLabels: Record<OrderStatus, string> = {
  pending: "Awaiting confirmation", confirmed: "Confirmed", cancelled: "Cancelled",
};
const date = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh", dateStyle: "medium", timeStyle: "short",
});

export function AdminOrders() {
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
        <p className="eyebrow">STORE OPERATIONS</p>
        <h1>Orders</h1>
        <p>New orders appear automatically while this workspace is open. Contact the customer to confirm the order and arrange payment.</p>
      </header>
      <section className="admin-panel" aria-label="Order inbox">
        <div className="admin-panel-heading">
          <h2>{before ? "Earlier orders" : "Order inbox"}</h2>
          <button type="button" onClick={notifyOrdersChanged}>Refresh</button>
        </div>
        {listError && <p role="alert">{listError}</p>}
        {loading ? <p role="status">Loading orders…</p> : !orders.length && !listError ? <p>No orders received yet.</p> : orders.length ? (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead><tr><th>Order</th><th>Received (Vietnam time)</th><th>Status</th><th>Items</th><th>Total</th></tr></thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td><button type="button" className="admin-order-link" disabled={busy} onClick={() => void openOrder(order.id)}>{orderReference(order.order_number)}</button>
                      {!order.seen_at && <span className="admin-order-new">New</span>}</td>
                    <td>{date.format(new Date(order.created_at))}</td>
                    <td>{statusLabels[order.status]}</td>
                    <td>{order.item_count}</td>
                    <td>{money(order.total_vnd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="admin-actions">
          {before && <button type="button" onClick={() => navigate(null)}>Newest orders</button>}
          {next && <button type="button" onClick={() => navigate(next)}>Earlier orders</button>}
        </div>
      </section>
      {detailError && <p role="alert">{detailError}</p>}
      {detail && (
        <section className="admin-panel admin-order-detail" aria-labelledby="admin-order-detail">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">{statusLabels[detail.status]}</p>
              <h2 id="admin-order-detail" ref={detailTitle} tabIndex={-1}>{orderReference(detail.order_number)}</h2>
            </div>
            <button type="button" disabled={busy} onClick={() => setDetail(null)}>Close details</button>
          </div>
          <dl className="admin-order-addresses">
            <div><dt>Contact</dt><dd>{detail.email}</dd><dd>{detail.phone}</dd></div>
            <div><dt>Ship to</dt><dd>{addressLines(detail.delivery).map((line, i) => <span key={i}>{line}</span>)}</dd></div>
            <div><dt>Billing address</dt><dd>{addressLines(detail.billing).map((line, i) => <span key={i}>{line}</span>)}</dd></div>
            {detail.notes && <div><dt>Order notes</dt><dd>{detail.notes}</dd></div>}
          </dl>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead><tr><th>Product</th><th>Variant</th><th>Quantity</th><th>Subtotal</th></tr></thead>
              <tbody>{detail.lines.map(line => (
                <tr key={line.variantId}><td>{line.name}<small>{line.sku}</small></td><td>{line.color} / {line.size}</td><td>{line.quantity}</td><td>{money(line.quantity * line.price)}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <p className="admin-order-total"><strong>{money(detail.total_vnd)}</strong> · Free shipping · Taxes included. No payment collected online.</p>
          {detail.status !== "cancelled" && (
            <div className="admin-actions">
              {detail.status === "pending" && <button type="button" className="button dark" disabled={busy || cancelConfirm} onClick={() => void changeStatus("confirm")}>Confirm order</button>}
              {cancelConfirm ? <>
                <p>Cancel this order and return the reserved items to stock?</p>
                <button type="button" disabled={busy} onClick={() => void changeStatus("cancel")}>Yes, cancel order</button>
                <button type="button" disabled={busy} onClick={() => setCancelConfirm(false)}>Keep order</button>
              </> : <button type="button" disabled={busy} onClick={() => setCancelConfirm(true)}>Cancel order</button>}
            </div>
          )}
        </section>
      )}
    </>
  );
}
