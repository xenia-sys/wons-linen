"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { staffAuth } from "../../lib/admin-browser";
import type { StaffRole } from "../../lib/admin-validation";
type Profile = { email: string; role: StaffRole };
const StaffContext = createContext<Profile | null>(null);
export function useStaff() {
  const p = useContext(StaffContext);
  if (!p) throw Error("Staff session required.");
  return p;
}
export function AdminShell({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<Profile | null>(null),
    [loading, setLoading] = useState(enabled),
    [denied, setDenied] = useState("");
  const path = usePathname(),
    router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    let current = 0;
    let active = true;
    const {
      data: { subscription },
    } = staffAuth().auth.onAuthStateChange((_event, session) => {
      const version = ++current;
      if (!session) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      void fetch("/api/admin/session", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      })
        .then(async (r) => {
          if (!r.ok)
            throw Error(
              r.status === 403
                ? "Your email has not been granted store access. Contact the WONS owner."
                : "Your session could not be verified. Please sign in again.",
            );
          return r.json();
        })
        .then((p) => {
          if (active && current === version) {
            setProfile(p);
            setDenied("");
          }
        })
        .catch((e) => {
          if (active && current === version) {
            setProfile(null);
            setDenied(e.message);
          }
        })
        .finally(() => {
          if (active && current === version) setLoading(false);
        });
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [enabled]);
  useEffect(() => {
    if (profile && path === "/admin/login") router.replace("/admin/products");
  }, [profile, path, router]);
  if (!enabled)
    return (
      <div className="admin-root admin-access">
        <Link href="/" className="admin-wordmark">
          WONS
        </Link>
        <h1>Production access only.</h1>
        <p>
          Product administration is disabled in preview and development
          deployments.
        </p>
        <a
          className="button dark"
          href="https://wons-linen.vercel.app/admin/login"
        >
          Open WONS admin
        </a>
      </div>
    );
  if (loading)
    return (
      <div className="admin-root admin-access">
        <p className="eyebrow">WONS / STORE ADMINISTRATION</p>
        <p role="status">Checking your session…</p>
      </div>
    );
  if (!profile)
    return (
      <div className="admin-root">
        <LoginPanel denied={denied} />
      </div>
    );
  return (
    <StaffContext.Provider value={profile}>
      <div className="admin-root admin-workspace">
        <aside className="admin-sidebar">
          <Link href="/admin/products" className="admin-wordmark">
            WONS<span>STORE ADMIN</span>
          </Link>
          <span className="admin-role">
            {profile.role === "owner" ? "Owner" : "Marketing Editor"}
          </span>
          <nav aria-label="Store administration">
            <Link
              href="/admin/products"
              aria-current={
                path.startsWith("/admin/products") ? "page" : undefined
              }
            >
              Products
            </Link>
            {profile.role === "owner" && (
              <>
                <Link
                  href="/admin/team"
                  aria-current={path === "/admin/team" ? "page" : undefined}
                >
                  Team & access
                </Link>
                <Link
                  href="/admin/activity"
                  aria-current={path === "/admin/activity" ? "page" : undefined}
                >
                  Activity history
                </Link>
              </>
            )}
          </nav>
          <div className="admin-sidebar-bottom">
            <Link href="/">View storefront ↗</Link>
            <p>{profile.email}</p>
            <button
              onClick={async () => {
                await staffAuth().auth.signOut();
                router.replace("/admin/login");
              }}
            >
              Sign out
            </button>
          </div>
        </aside>
        <main className="admin-content" id="admin-main">
          <div className="admin-topbar">
            <span>WONS LINEN / STORE OPERATIONS</span>
            <span>Orders remain closed</span>
          </div>
          {children}
        </main>
      </div>
    </StaffContext.Provider>
  );
}
function LoginPanel({ denied }: { denied: string }) {
  const [mode, setMode] = useState<"login" | "register">("login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "login") {
        const { error } = await staffAuth().auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error)
          throw Error(
            "Sign-in failed. Check your email, password and email confirmation.",
          );
      } else {
        const { error } = await staffAuth().auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${location.origin}/admin/login` },
        });
        if (error)
          throw Error(
            "Account activation could not be completed. Contact the Owner to check email delivery and your access.",
          );
        setMessage(
          "Check your email to confirm your account, then sign in. Store access is granted separately by the Owner.",
        );
      }
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Sign-in could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-login">
      <div className="admin-login-story">
        <Link className="admin-wordmark" href="/">
          WONS
        </Link>
        <p className="eyebrow">BEHIND THE COLLECTION</p>
        <h1>
          A thoughtful
          <br />
          space to
          <br />
          <em>make it yours.</em>
        </h1>
        <p>
          Manage the collection, tell its story and keep every detail in place.
        </p>
      </div>
      <div className="admin-login-form">
        <p className="eyebrow">WONS STORE ADMINISTRATION</p>
        <h2>{mode === "login" ? "Welcome back." : "Activate your account."}</h2>
        <p>Use the individual email address approved by the WONS Owner.</p>
        <form onSubmit={submit}>
          <label>
            Email address
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              minLength={mode === "register" ? 12 : 1}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {mode === "register" && (
            <p className="admin-help">
              Use at least 12 characters. Account activation does not grant
              store permissions automatically.
            </p>
          )}
          <button className="button dark" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create staff account"}
          </button>
        </form>
        <div role="status" className="admin-message">
          {message || denied}
        </div>
        <button
          className="admin-text-button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setMessage("");
            setPassword("");
          }}
        >
          {mode === "login"
            ? "First visit? Activate a staff account"
            : "Already activated? Sign in"}
        </button>
        {denied && (
          <button
            className="admin-text-button"
            onClick={() => staffAuth().auth.signOut()}
          >
            Clear session
          </button>
        )}
        <Link href="/" className="admin-back">
          ← Back to WONS
        </Link>
      </div>
    </div>
  );
}
