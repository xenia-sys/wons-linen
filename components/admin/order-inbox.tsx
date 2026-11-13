"use client";

import { useAdminLanguage } from "./admin-language";
import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-browser";

const ORDERS_CHANGED = "wons:orders-changed";
const REFRESH_MS = 15000;

export function notifyOrdersChanged() {
  window.dispatchEvent(new Event(ORDERS_CHANGED));
}

// Poll only in visible, signed-in Owner workspaces, and refresh on return.
export function useOrderRefresh(load: (signal: AbortSignal) => Promise<void>) {
  useEffect(() => {
    let current: AbortController | undefined;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      current?.abort();
      current = new AbortController();
      void load(current.signal);
    };
    refresh();
    const timer = window.setInterval(refresh, REFRESH_MS);
    window.addEventListener(ORDERS_CHANGED, refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      current?.abort();
      window.clearInterval(timer);
      window.removeEventListener(ORDERS_CHANGED, refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);
}

const loadNew = async (signal: AbortSignal) => adminFetch("/orders?count=new", { signal });

export function OrderInboxBadge() {
  const { t } = useAdminLanguage();
  const [count, setCount] = useState(0);
  const [load] = useState(() => async (signal: AbortSignal) => {
    try {
      const { count } = await loadNew(signal);
      if (!signal.aborted && Number.isSafeInteger(count) && count >= 0) setCount(count);
    } catch {
      // Keep the last known count on a temporary network error.
    }
  });
  useOrderRefresh(load);
  return <span className="admin-order-count" aria-live="polite">{count > 0 ? <span>{t("{count} new", { count })}</span> : null}</span>;
}
