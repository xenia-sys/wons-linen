"use client";
import { useState, type FormEvent } from "react";
import { addressFields, parseAddress, type Address, type AddressKind } from "../../lib/customer-account";
import { customerAuth } from "../../lib/customer-browser";

export function AddressEditor({
  kind, initial, userId,
}: { kind: AddressKind; initial?: Address; userId: string }) {
  const [address, setAddress] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const title = kind === "shipping" ? "Shipping address" : "Billing address";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const next = parseAddress(kind, new FormData(event.currentTarget));
    if (!next) {
      setError("Check the required fields and try again.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error } = await customerAuth().from("customer_addresses")
        .upsert({ ...next, user_id: userId }, { onConflict: "user_id,kind" });
      if (error) throw error;
      setAddress(next);
      setEditing(false);
      setMessage("Address saved.");
    } catch {
      setError("The address could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error } = await customerAuth().from("customer_addresses")
        .delete().eq("user_id", userId).eq("kind", kind);
      if (error) throw error;
      setAddress(undefined);
      setRemoving(false);
      setMessage("Address removed.");
    } catch {
      setError("The address could not be removed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="account-address">
      <h3>{title}</h3>
      {editing ? (
        <form onSubmit={save} aria-label={title}>
          <fieldset className="account-form" disabled={busy}>
            {addressFields.map((field) => (
              <label key={field.name}>
                {field.label}{!field.required && <span className="account-small"> (optional)</span>}
                <input name={field.name} defaultValue={address?.[field.name] ?? ""}
                  maxLength={field.max} required={field.required} autoComplete={kind + " " + field.auto} />
              </label>
            ))}
            <div className="account-actions">
              <button className="button dark" type="submit">{busy ? "Saving…" : "Save address"}</button>
              <button className="underlined-link" type="button" onClick={() => { setEditing(false); setError(""); }}>Cancel</button>
            </div>
          </fieldset>
        </form>
      ) : (
        <>
          {address ? (
            <address>
              <strong>{address.recipient}</strong><br />
              {address.line1}{address.line2 && <><br />{address.line2}</>}<br />
              {[address.city, address.region, address.postal_code].filter(Boolean).join(", ")}<br />
              {address.country}
            </address>
          ) : <p>No address saved.</p>}
          {removing ? (
            <div className="account-actions">
              <p>Remove this {kind} address?</p>
              <button className="button dark" type="button" disabled={busy} onClick={remove}>{busy ? "Removing…" : "Remove address"}</button>
              <button className="underlined-link" type="button" disabled={busy} onClick={() => { setRemoving(false); setError(""); }}>Cancel</button>
            </div>
          ) : (
            <div className="account-actions">
              <button className="underlined-link" type="button" onClick={() => { setEditing(true); setMessage(""); }}>
                {address ? "Edit address" : "Add address"}
              </button>
              {address && <button className="underlined-link" type="button" onClick={() => { setRemoving(true); setMessage(""); }}>Remove</button>}
            </div>
          )}
        </>
      )}
      {message && <p className="account-notice" role="status">{message}</p>}
      {error && <p className="account-error" role="alert">{error}</p>}
    </article>
  );
}
