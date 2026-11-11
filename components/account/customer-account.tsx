"use client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { customerAuth } from "../../lib/customer-browser";
import { AccountAccess } from "./account-access";
import { AccountDashboard } from "./account-dashboard";

type AccountState =
  | { status: "checking" }
  | { status: "unavailable" }
  | { status: "staff" }
  | { status: "guest"; linkError?: string }
  | { status: "signed-in"; user: User };

export function CustomerAccount({ enabled }: { enabled: boolean }) {
  const [state, setState] = useState<AccountState>({ status: "checking" });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const auth = customerAuth().auth;
    const incoming = new URL(window.location.href);
    const returnedFromLink = incoming.searchParams.has("code") ||
      incoming.searchParams.has("error") || incoming.hash.includes("error=");
    let disposed = false;
    let revision = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      const current = ++revision;
      clearTimeout(timer);
      // Supabase Auth callbacks run under an internal lock; verify outside it.
      timer = setTimeout(async () => {
        if (disposed || current !== revision) return;
        if (!session) {
          if (returnedFromLink) {
            const clean = new URL(window.location.href);
            for (const key of ["code", "error", "error_code", "error_description"]) {
              clean.searchParams.delete(key);
            }
            clean.hash = "";
            window.history.replaceState(null, "", clean);
          }
          setState({ status: "guest", linkError: returnedFromLink && event === "INITIAL_SESSION"
            ? "This link could not be verified. Request a new one and open it in the same browser."
            : undefined });
          return;
        }
        try {
          const { data: { user }, error } = await auth.getUser();
          if (disposed || current !== revision) return;
          if (error) {
            setState(error.status === 401 || error.status === 403
              ? { status: "guest" }
              : { status: "unavailable" });
            return;
          }
          if (!user?.email_confirmed_at || user.is_anonymous) {
            setState({ status: "guest", linkError: "Verify your email to access your account." });
            return;
          }
          const { data: staff, error: staffError } = await customerAuth().rpc("staff_profile");
          if (disposed || current !== revision) return;
          setState(staffError ? { status: "unavailable" }
            : staff ? { status: "staff" } : { status: "signed-in", user });
        } catch {
          if (!disposed && current === revision) setState({ status: "unavailable" });
        }
      }, 0);
    });
    return () => {
      disposed = true;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [enabled, retry]);

  return (
    <section className="account-page section-space" aria-labelledby="account-title">
      <header className="account-intro">
        <p className="eyebrow">WONS LINEN / YOUR SPACE</p>
        <h1 id="account-title">My account</h1>
        <p>View your recent orders, manage shipping and billing addresses, and edit your password and account details.</p>
      </header>
      {!enabled ? <AccountAccess enabled={false} /> :
        state.status === "signed-in" ? <AccountDashboard key={state.user.id} user={state.user} /> :
        state.status === "staff" ? <StaffAccountNotice /> :
        state.status === "checking" ? <p role="status">Checking your sign-in…</p> :
        state.status === "unavailable" ? (
          <div className="account-access">
            <p role="alert">Your account could not be loaded.</p>
            <button type="button" className="button dark" onClick={() => {
              setState({ status: "checking" });
              setRetry((value) => value + 1);
            }}>Try again</button>
          </div>
        ) : <AccountAccess enabled linkError={state.linkError} />}
    </section>
  );
}

function StaffAccountNotice() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div className="account-access">
      <h2>Staff account</h2>
      <p>Use the staff portal for this email, or sign in with a different email to access a shopping account.</p>
      <div className="account-actions">
        <Link href="/admin/login" className="button dark">Staff sign-in</Link>
        <button className="underlined-link" type="button" disabled={busy} onClick={async () => {
          setBusy(true);
          setError(false);
          try {
            const { error } = await customerAuth().auth.signOut({ scope: "local" });
            if (error) throw error;
          } catch {
            setError(true);
          } finally {
            setBusy(false);
          }
        }}>Use a different email</button>
      </div>
      {error && <p role="alert">Sign-out could not be completed. Please try again.</p>}
    </div>
  );
}
