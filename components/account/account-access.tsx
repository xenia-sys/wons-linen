"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { parseUsername } from "../../lib/customer-account";
import { accountRedirect, customerAuth, customerAuthMessage } from "../../lib/customer-browser";

const linkSent = "If your email can be used, a sign-in link is on its way. Open it in the same browser to continue.";

export function AccountAccess({
  enabled, linkError,
}: { enabled: boolean; linkError?: string }) {
  const [mode, setMode] = useState<"sign-in" | "register">("sign-in");
  const [withPassword, setWithPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const registering = mode === "register";
  const passwordLogin = !registering && withPassword;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || busy) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const username = parseUsername(form.get("username"));
    setError("");
    setMessage("");
    if (registering && !username) {
      setError("Enter a username between 2 and 60 characters.");
      return;
    }
    setBusy(true);
    try {
      const { error } = passwordLogin
        ? await customerAuth().auth.signInWithPassword({
            email, password: String(form.get("password") ?? ""),
          })
        : await customerAuth().auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: registering,
              emailRedirectTo: accountRedirect(),
              ...(registering ? { data: { wons_username: username } } : {}),
            },
          });
      if (error) {
        // Do not disclose whether a submitted email has an account.
        if (error.code === "otp_disabled" || error.code === "user_not_found")
          setMessage(linkSent);
        else setError(customerAuthMessage(error));
      } else if (!passwordLogin) {
        setMessage(linkSent);
      }
    } catch {
      setError("We could not connect. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function changeMode(next: typeof mode) {
    setMode(next);
    setWithPassword(false);
    setError("");
    setMessage("");
  }

  return (
    <div className="account-access">
      <div className="account-switch" aria-label="Account access">
        <button type="button" aria-pressed={!registering} onClick={() => changeMode("sign-in")} disabled={busy}>
          Sign in
        </button>
        <button type="button" aria-pressed={registering} onClick={() => changeMode("register")} disabled={busy}>
          Create account
        </button>
      </div>
      <h2>{registering ? "Create your account" : "Welcome back"}</h2>
      <p>{registering
        ? "Just a username and email. We’ll send you a secure link to verify your email."
        : passwordLogin ? "Sign in using your email and password."
          : "Enter your email to receive a secure sign-in link."}</p>
      {!enabled && <p className="account-notice" role="status">Account access will open once email verification is ready.</p>}
      {linkError && <p className="account-error" role="alert">{linkError}</p>}
      <form onSubmit={submit} aria-label={registering ? "Create account" : "Sign in"}>
        <fieldset disabled={!enabled || busy} className="account-form">
          {registering && <label>Username<input name="username" autoComplete="nickname" required minLength={2} maxLength={60} /></label>}
          <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          {passwordLogin && <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={72} /></label>}
          <button className="button dark" type="submit">
            {busy ? "Please wait…" : registering ? "Create account" : passwordLogin ? "Sign in" : "Send sign-in link"}
          </button>
        </fieldset>
      </form>
      {message && <p className="account-notice" role="status">{message}</p>}
      {error && <p className="account-error" role="alert">{error}</p>}
      {!registering && enabled && (
        <button className="underlined-link" type="button" disabled={busy} onClick={() => {
          setWithPassword(!withPassword);
          setMessage("");
          setError("");
        }}>{passwordLogin ? "Use an email link instead" : "Use a password instead"}</button>
      )}
      <p className="account-small">An account is optional. <Link href="/shop">Continue exploring</Link>.</p>
      <Link className="account-small underlined-link" href="/information/privacy">Privacy &amp; your bag</Link>
    </div>
  );
}
