"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { parseUsername, type Address, type OrderSummary } from "../../lib/customer-account";
import { customerAuth } from "../../lib/customer-browser";
import { money } from "../../lib/commerce";
import { AddressEditor } from "./address-editor";
import { AccountDetails, AccountPassword } from "./account-settings";

type AccountData = {
  addresses: Address[] | null;
  orders: OrderSummary[] | null;
};

const orderStatus: Record<OrderSummary["status"], string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};
const orderDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" });
const addressColumns = "kind,recipient,line1,line2,city,region,postal_code,country";

export function AccountDashboard({ user }: { user: User }) {
  const [data, setData] = useState<AccountData | null>(null);
  const [retry, setRetry] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const username = parseUsername(user.user_metadata?.wons_username);

  useEffect(() => {
    const controller = new AbortController();
    const client = customerAuth();
    void Promise.allSettled([
      client.from("customer_addresses").select(addressColumns).eq("user_id", user.id).abortSignal(controller.signal),
      client.from("customer_order_summaries").select("id,order_number,placed_at,status,total_vnd")
        .eq("user_id", user.id).order("placed_at", { ascending: false }).limit(5).abortSignal(controller.signal),
    ]).then(([addresses, orders]) => {
      if (controller.signal.aborted) return;
      setData({
        addresses: addresses.status === "fulfilled" && !addresses.value.error
          ? addresses.value.data : null,
        orders: orders.status === "fulfilled" && !orders.value.error
          ? orders.value.data : null,
      });
    });
    return () => controller.abort();
  }, [user.id, retry]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setError("");
    try {
      const { error } = await customerAuth().auth.signOut({ scope: "local" });
      if (error) throw error;
    } catch {
      setError("Sign-out could not be completed. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  function refresh() {
    setData(null);
    setRetry((value) => value + 1);
  }

  return (
    <div className="account-dashboard">
      <div className="account-dashboard-bar">
        <p>{username ? `Welcome, ${username}.` : "Welcome to WONS."}</p>
        <button className="underlined-link" type="button" onClick={signOut} disabled={signingOut}>
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
      {error && <p className="account-error" role="alert">{error}</p>}
      <nav className="account-nav" aria-label="Account sections">
        <a href="#recent-orders">Recent orders</a><a href="#addresses">Addresses</a>
        <a href="#account-details">Account details</a><a href="#password">Password</a>
      </nav>
      <section className="account-panel" id="recent-orders" aria-labelledby="orders-title">
        <h2 id="orders-title">Recent orders</h2>
        {!data ? <p role="status">Loading your orders…</p> :
          !data.orders ? <><p role="alert">Your orders could not be loaded.</p><button className="underlined-link" onClick={refresh}>Try again</button></> :
          data.orders.length === 0 ? <><p>No orders yet. Orders placed with this account will appear here once shopping opens.</p><Link className="underlined-link" href="/shop">Explore the collection</Link></> :
          <ul className="account-orders">
            {data.orders.map((order) => (
              <li key={order.id}>
                <strong>{order.order_number}</strong>
                <time dateTime={order.placed_at}>{orderDate.format(new Date(order.placed_at))}</time>
                <span>{orderStatus[order.status]}</span>
                <span>{money(order.total_vnd)}</span>
              </li>
            ))}
          </ul>}
      </section>
      <section className="account-panel" id="addresses" aria-labelledby="addresses-title">
        <h2 id="addresses-title">Addresses</h2>
        <p>Save the addresses you’d like to use for future orders.</p>
        {!data ? <p role="status">Loading your addresses…</p> :
          !data.addresses ? <><p role="alert">Your addresses could not be loaded.</p><button className="underlined-link" onClick={refresh}>Try again</button></> :
          <div className="account-grid">
            {(["shipping", "billing"] as const).map((kind) => (
              <AddressEditor key={kind} kind={kind} userId={user.id} initial={data.addresses?.find((a) => a.kind === kind)} />
            ))}
          </div>}
      </section>
      <div className="account-grid">
        <section className="account-panel" id="account-details" aria-labelledby="details-title">
          <h2 id="details-title">Account details</h2>
          <AccountDetails user={user} />
        </section>
        <section className="account-panel" id="password" aria-labelledby="password-title">
          <h2 id="password-title">Password</h2>
          <AccountPassword />
        </section>
      </div>
    </div>
  );
}
