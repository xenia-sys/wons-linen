"use client";
import { AdminLanguageSwitch, useAdminLanguage } from "./admin-language";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { staffAuth } from "../../lib/admin-browser";
import { OrderInboxBadge } from "./order-inbox";
import { adminLoginPath, adminNavigation, adminNextPath, adminSectionName, canOpenAdminSection, staffRoleLabel, STAFF_AUTH_REQUIRED, STAFF_ACCESS_CHANGED } from "../../lib/admin-navigation";
import type { StaffRole } from "../../lib/admin-validation";
type Profile = { email: string; role: StaffRole };
type AccessIssue = { kind: "signed_out" | "denied" | "error"; message: string };
const StaffContext = createContext<Profile | null>(null);
export function useStaff() {
  const profile = useContext(StaffContext);
  if (!profile) throw Error("Staff session required.");
  return profile;
}
export function AdminShell(props: { enabled: boolean; children: React.ReactNode }) {
  const { locale } = useAdminLanguage();
  return <div lang={locale} className="admin-language-frame"><AdminWorkspace {...props} /></div>;
}

function AdminWorkspace({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const { t, errorText } = useAdminLanguage();
  const accessLanguage = <div className="admin-access-language"><AdminLanguageSwitch /></div>;
  const [profile, setProfile] = useState<Profile | null>(null);
  const verifiedProfile = useRef<Profile | null>(null);
  const [checking, setChecking] = useState(enabled);
  const [issue, setIssue] = useState<AccessIssue | null>(null);
  const [verification, setVerification] = useState(0);
  const [destination, setDestination] = useState("/admin");
  const [signOutError, setSignOutError] = useState("");
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (path === "/admin/login") setDestination(adminNextPath(new URLSearchParams(window.location.search).get("next")));
  }, [path]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let sequence = 0;
    let pending: AbortController | undefined;
    if (!verifiedProfile.current) setChecking(true);
    const initialTimeout = setTimeout(() => {
      if (!active) return;
      verifiedProfile.current = null;
      setProfile(null);
      setChecking(false);
      setIssue({ kind: "error", message: "Your session could not be loaded. Try again to open the workspace." });
    }, 15000);
    const { data: { subscription } } = staffAuth().auth.onAuthStateChange((_event, session) => {
      clearTimeout(initialTimeout);
      const request = ++sequence;
      pending?.abort();
      if (!session) {
        verifiedProfile.current = null;
        setProfile(null);
        setChecking(false);
        setIssue(previous => previous?.kind === "signed_out" ? previous : null);
        return;
      }
      // The callback stays synchronous. Token refresh verifies access in the
      // background without unmounting the current page or resetting its data.
      if (verifiedProfile.current && verifiedProfile.current.email.toLowerCase() !== (session.user.email ?? "").toLowerCase()) {
        verifiedProfile.current = null;
        setProfile(null);
      }
      if (!verifiedProfile.current) setChecking(true);
      const controller = new AbortController();
      pending = controller;
      const timeout = setTimeout(() => controller.abort(), 15000);
      void fetch("/api/admin/session", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store", signal: controller.signal,
      }).then(async response => {
        const result = await response.json().catch(() => null);
        if (!response.ok) throw { status: response.status, message: result?.message };
        if (!result || typeof result.email !== "string" || !["owner", "marketing_editor"].includes(result.role)) {
          throw { status: 503 };
        }
        if (active && sequence === request) {
          verifiedProfile.current = result;
          setProfile(result);
          setIssue(null);
        }
      }).catch((error: unknown) => {
        if (!active || sequence !== request) return;
        verifiedProfile.current = null;
        setProfile(null);
        const status = (error as { status?: number })?.status;
        setIssue(status === 401 ? { kind: "signed_out", message: "Your session ended. Please sign in again." }
          : status === 403 ? { kind: "denied", message: "This account does not have active WONS staff access. Contact the Owner or use another account." }
          : { kind: "error", message: "We could not verify your store access. Check your connection and try again." });
      }).finally(() => {
        clearTimeout(timeout);
        if (active && sequence === request) setChecking(false);
      });
    });
    const requireSignIn = () => {
      ++sequence;
      pending?.abort();
      verifiedProfile.current = null;
      setProfile(null);
      setIssue({ kind: "signed_out", message: "Your session ended. Please sign in again." });
      setChecking(false);
    };
    const checkAccess = () => setVerification(value => value + 1);
    window.addEventListener(STAFF_AUTH_REQUIRED, requireSignIn);
    window.addEventListener(STAFF_ACCESS_CHANGED, checkAccess);
    return () => {
      active = false;
      ++sequence;
      pending?.abort();
      clearTimeout(initialTimeout);
      subscription.unsubscribe();
      window.removeEventListener(STAFF_AUTH_REQUIRED, requireSignIn);
      window.removeEventListener(STAFF_ACCESS_CHANGED, checkAccess);
    };
  }, [enabled, verification]);
  useEffect(() => {
    if (!enabled || checking) return;
    if (profile && path === "/admin/login") {
      router.replace(adminNextPath(new URLSearchParams(window.location.search).get("next"), profile.role));
    } else if (!profile && (!issue || issue.kind === "signed_out") && path !== "/admin/login") {
      router.replace(adminLoginPath(path));
    }
  }, [enabled, checking, profile, issue, path, router]);
  async function signOut() {
    setSignOutError("");
    try {
      const { error } = await staffAuth().auth.signOut();
      if (error) throw error;
      verifiedProfile.current = null;
      setProfile(null);
      setIssue(null);
      router.replace("/admin/login");
    } catch {
      setSignOutError("Sign-out could not be completed. Please try again.");
    }
  }
  if (!enabled) return <div className="admin-root admin-access">{accessLanguage}<Link href="/" className="admin-wordmark">WONS</Link><h1>{t("Production access only.")}</h1><p>{t("Use the live WONS website to manage the store.")}</p><a className="button dark" href="https://wons-linen.vercel.app/admin/login">{t("Open WONS admin")}</a></div>;
  if (checking) return <div className="admin-root admin-access">{accessLanguage}<p className="eyebrow">{t("WONS / STORE ADMINISTRATION")}</p><p role="status">{t("Checking your session…")}</p></div>;
  if (!profile) {
    if (issue && issue.kind !== "signed_out") return <div className="admin-root admin-access">{accessLanguage}
      <Link href="/" className="admin-wordmark">WONS</Link>
      <h1>{issue.kind === "denied" ? t("Store access required.") : t("Unable to open your workspace.")}</h1>
      <p role="alert">{errorText(issue.message)}</p>
      <div className="admin-actions"><button className="button dark" onClick={() => setVerification(value => value + 1)}>{t("Try again")}</button><button onClick={signOut}>{t("Use another account")}</button></div>
      {signOutError && <p role="alert">{errorText(signOutError)}</p>}<Link href="/">{t("Back to WONS")}</Link>
    </div>;
    if (path !== "/admin/login") return <div className="admin-root admin-access">{accessLanguage}<p role="status">{t("Redirecting to sign in…")}</p></div>;
    return <div className="admin-root">{accessLanguage}<LoginPanel notice={issue?.message ?? ""} destination={destination} /></div>;
  }
  if (path === "/admin/login") return <div className="admin-root admin-access">{accessLanguage}<p role="status">{t("Opening your workspace…")}</p></div>;
  const navigation = adminNavigation(profile.role);
  return <StaffContext.Provider value={profile}>
    <div className="admin-root admin-workspace">
      <a href="#admin-main" className="skip-link">{t("Skip to workspace")}</a>
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-wordmark">WONS<span>{t("STORE ADMIN")}</span></Link>
        <span className="admin-role">{t(staffRoleLabel(profile.role))}</span>
        <nav aria-label={t("Store administration")}>
          {["Store operations", "Owner tools"].map(group => {
            const items = navigation.filter(item => item.group === group);
            return items.length ? <div className="admin-nav-group" key={group}>
              <p className="admin-nav-heading">{t(group)}</p>
              {items.map(item => <Link key={item.href} href={item.href} aria-current={(path === item.href || (item.href === "/admin/products" && path.startsWith("/admin/products/"))) ? "page" : undefined}>{t(item.label)}{item.href === "/admin/orders" && <OrderInboxBadge />}</Link>)}
            </div> : null;
          })}
        </nav>
        <div className="admin-sidebar-bottom"><Link href="/">{t("View storefront ↗")}</Link><p>{profile.email}</p><button onClick={signOut}>{t("Sign out")}</button>{signOutError && <p role="alert">{errorText(signOutError)}</p>}</div>
      </aside>
      <main className="admin-content" id="admin-main" tabIndex={-1}>
        <div className="admin-topbar"><nav aria-label={t("Breadcrumb")}><Link href="/admin">{t("WONS Admin")}</Link><span> / {t(adminSectionName(path))}</span></nav><div className="admin-topbar-tools"><span>{t("{role} workspace", { role: t(staffRoleLabel(profile.role)) })}</span><AdminLanguageSwitch /></div></div>
        {canOpenAdminSection(profile.role, path) ? children : <section className="admin-panel admin-route-denied">
          <p className="eyebrow">{t("OWNER TOOLS")}</p><h1>{t("Owner access required.")}</h1><p>{t("Your Marketing Editor account can manage products, images, prices and publication. Orders, team access and activity history are managed by the Owner.")}</p><Link className="button dark" href="/admin/products">{t("Go to products")}</Link>
        </section>}
      </main>
    </div>
  </StaffContext.Provider>;
}
function LoginPanel({ notice, destination }: { notice: string; destination: string }) {
  const { t, errorText, locale } = useAdminLanguage();
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
        <p className="eyebrow">{t("BEHIND THE COLLECTION")}</p>
        <h1>{locale === "vi" ? <>Không gian để<br /><em>ghi dấu ấn riêng.</em></> : <>
          A thoughtful
          <br />
          space to
          <br />
          <em>make it yours.</em>
        </>}</h1>
        <p> {t("Manage the collection, tell its story and keep every detail in place.")} </p>
      </div>
      <div className="admin-login-form">
        <p className="eyebrow">{t("WONS STORE ADMINISTRATION")}</p>
        <h2>{mode === "login" ? t("Welcome back.") : t("Activate your account.")}</h2>
        <p>{destination === "/admin" ? t("Use your approved staff account to open the WONS workspace.") : t("Sign in to continue to {section}.", { section: t(adminSectionName(destination)) })}</p>
        <form onSubmit={submit}>
          <label> {t("Email address")} <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label> {t("Password")} <input
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
            <p className="admin-help"> {t("Use at least 12 characters. Account activation does not grant store permissions automatically.")} </p>
          )}
          <button className="button dark" disabled={busy}>
            {busy
              ? t("Please wait…")
              : mode === "login"
                ? t("Sign in")
                : t("Create staff account")}
          </button>
        </form>
        <div role="status" className="admin-message">
          {errorText(message || notice)}
        </div>
        <button
          className="admin-text-button"
          disabled={busy}
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setMessage("");
            setPassword("");
          }}
        >
          {mode === "login"
            ? t("First visit? Activate a staff account")
            : t("Already activated? Sign in")}
        </button>
        {notice && (
          <button
            className="admin-text-button"
            onClick={() => staffAuth().auth.signOut()}
          > {t("Clear session")} </button>
        )}
        <Link href="/" className="admin-back"> {t("← Back to WONS")} </Link>
      </div>
    </div>
  );
}
