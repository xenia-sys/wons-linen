"use client";
import { useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { parseUsername } from "../../lib/customer-account";
import { accountRedirect, customerAuth, customerAuthMessage } from "../../lib/customer-browser";

export function AccountDetails({ user }: { user: User }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const username = parseUsername(user.user_metadata?.wons_username) ?? "";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const name = parseUsername(form.get("username"));
    const email = String(form.get("email") ?? "").trim();
    setError("");
    setMessage("");
    if (!name) {
      setError("Enter a username between 2 and 60 characters.");
      return;
    }
    const changingEmail = email.toLowerCase() !== user.email?.toLowerCase();
    setBusy(true);
    try {
      const { error } = await customerAuth().auth.updateUser({
        data: { wons_username: name },
        ...(changingEmail ? { email } : {}),
      }, { emailRedirectTo: accountRedirect() });
      if (error) setError(customerAuthMessage(error));
      else setMessage(changingEmail
        ? "Check your email and follow the confirmation instructions. Your current email remains active until the change is verified."
        : "Account details saved.");
    } catch {
      setError("Your changes could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} aria-label="Account details">
      <fieldset className="account-form" disabled={busy}>
        <label>Username<input name="username" defaultValue={username} autoComplete="nickname" required minLength={2} maxLength={60} /></label>
        <label>Email<input key={user.email} name="email" type="email" defaultValue={user.email} autoComplete="email" required maxLength={254} /></label>
        <p className="account-small">A new email must be verified before it replaces your current address.</p>
        <button className="button dark" type="submit">{busy ? "Saving…" : "Save details"}</button>
      </fieldset>
      {message && <p className="account-notice" role="status">{message}</p>}
      {error && <p className="account-error" role="alert">{error}</p>}
    </form>
  );
}

export function AccountPassword() {
  const [busy, setBusy] = useState(false);
  const [verify, setVerify] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    const password = String(form.get("password") ?? "");
    const currentPassword = String(form.get("current_password") ?? "");
    const nonce = String(form.get("nonce") ?? "").trim();
    setError("");
    setMessage("");
    if (password.length < 10 || password !== form.get("confirm_password")) {
      setError("Use at least 10 characters and enter the same password twice.");
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError("That password is too long. Try a shorter one.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await customerAuth().auth.updateUser({
        password,
        ...(currentPassword ? { current_password: currentPassword } : {}),
        ...(nonce ? { nonce } : {}),
      });
      if (error?.code === "reauthentication_needed" || error?.code === "reauthentication_not_valid") {
        setVerify(true);
        setError(error.code === "reauthentication_needed"
          ? "Confirm it’s you with a code sent to your email."
          : customerAuthMessage(error));
      } else if (error) setError(customerAuthMessage(error));
      else {
        element.reset();
        setVerify(false);
        setMessage("Password saved. You can sign in with your email and password or a secure link.");
      }
    } catch {
      setError("Your password could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function sendCode() {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error } = await customerAuth().auth.reauthenticate();
      if (error) setError(customerAuthMessage(error));
      else setMessage("Check your email for the verification code.");
    } catch {
      setError("We could not send a verification code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} aria-label="Password">
      <fieldset className="account-form" disabled={busy}>
        <p className="account-small">A password is optional. You can always request a sign-in link.</p>
        <label>Current password <span className="account-small">(if you have one)</span>
          <input name="current_password" type="password" autoComplete="current-password" maxLength={72} />
        </label>
        <label>New password<input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required /></label>
        <label>Confirm new password<input name="confirm_password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required /></label>
        {verify && (
          <>
            <button className="underlined-link" type="button" onClick={sendCode}>Send verification code</button>
            <label>Verification code<input name="nonce" inputMode="numeric" autoComplete="one-time-code" maxLength={12} required /></label>
          </>
        )}
        <button className="button dark" type="submit">{busy ? "Please wait…" : "Save password"}</button>
      </fieldset>
      {message && <p className="account-notice" role="status">{message}</p>}
      {error && <p className="account-error" role="alert">{error}</p>}
    </form>
  );
}
