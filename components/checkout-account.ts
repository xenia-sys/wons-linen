"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Address } from "../lib/customer-account";
import { customerAuth } from "../lib/customer-browser";

export type CheckoutIdentity = { id: string; email: string };

export function checkoutIdentity(session: Session | null): CheckoutIdentity | null {
  const user = session?.user;
  return user?.email_confirmed_at && user.email && !user.is_anonymous
    ? { id: user.id, email: user.email } : null;
}

export function useCheckoutAccount(enabled: boolean) {
  const [identity, setIdentity] = useState<CheckoutIdentity | null>();
  const [saved, setSaved] = useState<{ id: string; addresses: Address[] }>();
  useEffect(() => {
    if (!enabled) return;
    const fallback = setTimeout(() => setIdentity(previous => previous ?? null), 5000);
    const { data: { subscription } } = customerAuth().auth.onAuthStateChange((_event, session) => {
      clearTimeout(fallback);
      const next = checkoutIdentity(session);
      setIdentity(previous => previous?.id === next?.id && previous?.email === next?.email && previous !== undefined
        ? previous : next);
    });
    return () => { clearTimeout(fallback); subscription.unsubscribe(); };
  }, [enabled]);

  const id = enabled ? identity?.id : undefined;
  useEffect(() => {
    setSaved(undefined);
    if (!id) return;
    let active = true;
    const abort = new AbortController();
    const timeout = setTimeout(() => { abort.abort(); if (active) setSaved({ id, addresses: [] }); }, 4000);
    void Promise.resolve(customerAuth().from("customer_addresses")
      .select("kind,recipient,line1,line2,city,region,postal_code,country").eq("user_id", id)
      .abortSignal(abort.signal))
      .then(({ data, error }) => {
        if (active && !abort.signal.aborted) setSaved({ id, addresses: error ? [] : data ?? [] });
      }, () => {
        if (active && !abort.signal.aborted) setSaved({ id, addresses: [] });
      }).finally(() => clearTimeout(timeout));
    return () => { active = false; abort.abort(); clearTimeout(timeout); };
  }, [id]);

  return {
    loading: enabled && (identity === undefined || Boolean(id && saved?.id !== id)),
    identity: enabled ? identity ?? null : null,
    addresses: id && saved?.id === id ? saved.addresses : [],
  };
}
