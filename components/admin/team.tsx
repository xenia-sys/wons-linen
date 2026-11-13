"use client";
import { useAdminLanguage } from "./admin-language";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { adminFetch } from "../../lib/admin-browser";
import { useStaff } from "./admin-shell";
type Member = {
  id: string;
  email: string;
  display_name: string;
  role: "owner" | "marketing_editor";
  active: boolean;
};
export function Team() {
  const { t, errorText } = useAdminLanguage();
  const profile = useStaff();
  const [members, setMembers] = useState<Member[]>([]),
    [email, setEmail] = useState(""),
    [name, setName] = useState(""),
    [role, setRole] = useState<Member["role"]>("marketing_editor"),
    [active, setActive] = useState(true),
    [busy, setBusy] = useState(false),
    [removal, setRemoval] = useState<Member | null>(null),
    [removalError, setRemovalError] = useState(""),
    [message, setMessage] = useState("");
  const approvedPanel = useRef<HTMLElement>(null);
  const approvedTitle = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);
  const removeTrigger = useRef<HTMLButtonElement>(null);
  async function load() {
    try {
      setMembers((await adminFetch("/team")).members);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  useEffect(() => {
    if (profile.role === "owner") void load();
  }, [profile.role]);
  useLayoutEffect(() => {
    const modal = dialog.current;
    const panel = approvedPanel.current;
    if (!modal || !panel) return;
    if (!removal) {
      if (modal.open) {
        modal.close();
        const trigger = removeTrigger.current;
        (trigger?.isConnected && !trigger.disabled ? trigger : approvedTitle.current)?.focus({ preventScroll: true });
      }
      return;
    }
    const position = () => {
      const frame = panel.getBoundingClientRect();
      const viewport = document.documentElement;
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      const visibleTop = Math.max(0, frame.top);
      const visibleBottom = Math.min(height, frame.bottom);
      const centerY = visibleBottom > visibleTop ? (visibleTop + visibleBottom) / 2 : height / 2;
      const centerX = (Math.max(0, frame.left) + Math.min(width, frame.right)) / 2;
      modal.style.setProperty("--team-popup-width", `${Math.max(0, Math.min(width, frame.width) - 24)}px`);
      const bounds = modal.getBoundingClientRect();
      const fit = (center: number, size: number, limit: number) => Math.max(12, Math.min(center - size / 2, limit - size - 12));
      modal.style.left = `${fit(centerX, bounds.width, width)}px`;
      modal.style.top = `${fit(centerY, bounds.height, height)}px`;
    };
    if (!modal.open) {
      modal.showModal();
      position();
      keepButton.current?.focus({ preventScroll: true });
    }
    const observer = new ResizeObserver(position);
    observer.observe(panel);
    observer.observe(modal);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position);
    };
  }, [removal]);
  if (profile.role !== "owner")
    return (
      <div className="admin-panel">
        <h1>{t("Owner access required.")}</h1>
        <p>{t("Team permissions are managed by the WONS Owner.")}</p>
      </div>
    );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await adminFetch("/team", {
        method: "POST",
        body: JSON.stringify({ email, display_name: name, role, active }),
      });
      await load();
      setMessage(
        "Access saved. Share the admin sign-in page with your teammate.",
      );
      setEmail("");
      setName("");
      setRole("marketing_editor");
      setActive(true);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(member: Member) {
    if (busy) return;
    setBusy(true);
    setRemovalError("");
    try {
      await adminFetch(`/team?id=${member.id}`, { method: "DELETE" });
      setMembers((current) => current.filter((item) => item.id !== member.id));
      if (email.trim().toLowerCase() === member.email) {
        setEmail("");
        setName("");
        setRole("marketing_editor");
        setActive(true);
      }
      setRemoval(null);
      setMessage("Admin access removed.");
    } catch (error) {
      setRemovalError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">{t("PEOPLE & PERMISSIONS")}</p>
          <h1>{t("Team & access")}</h1>
          <p>{t("Each teammate uses their own verified email account.")}</p>
        </div>
      </div>
      <div className="admin-editor-layout admin-team-layout">
        <section className="admin-panel" ref={approvedPanel} aria-labelledby="approved-team-heading">
          <h2 id="approved-team-heading" ref={approvedTitle} tabIndex={-1}>{t("Approved team")}</h2>
          <dialog
            ref={dialog}
            className="admin-team-confirm"
            role="alertdialog"
            aria-labelledby="team-remove-heading"
            aria-describedby="team-remove-member team-remove-description"
            onCancel={(event) => {
              event.preventDefault();
              if (!busy) setRemoval(null);
            }}
          >
            {removal && <>
              <h3 id="team-remove-heading">{t("Remove admin access?")}</h3>
              <p id="team-remove-member"><strong>{removal.display_name || removal.email}</strong>{removal.display_name && <> · {removal.email}</>}</p>
              <p id="team-remove-description">{t("This person will lose access to WONS Admin. Their sign-in account and past activity are kept.")}</p>
              {removalError && <p className="admin-error" role="alert">{errorText(removalError)}</p>}
              <div className="admin-actions">
                <button ref={keepButton} type="button" disabled={busy} onClick={() => setRemoval(null)}>{t("Keep access")}</button>
                <button type="button" className="admin-danger-button" disabled={busy} onClick={() => void remove(removal)}>{busy ? t("Removing access…") : t("Remove access")}</button>
              </div>
            </>}
          </dialog>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("Teammate")}</th>
                  <th>{t("Role")}</th>
                  <th>{t("Access")}</th>
                  <th>{t("Edit")}</th>
                  <th>{t("Remove")}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {m.display_name || m.email}
                      <small>{m.email}</small>
                    </td>
                    <td>{m.role === "owner" ? t("Owner") : t("Marketing Editor")}</td>
                    <td>{m.active ? t("Active") : t("Disabled")}</td>
                    <td>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setEmail(m.email);
                          setName(m.display_name);
                          setRole(m.role);
                          setActive(m.active);
                          setMessage(
                            "Editing this email address. Save to apply changes.",
                          );
                        }}
                      > {t("Edit")} </button>
                    </td>
                    <td>
                      {profile.email.toLowerCase() === m.email ? <span className="muted">{t("Your account")}</span> : (
                        <button type="button" className="admin-danger-button" aria-haspopup="dialog" disabled={busy} onClick={(event) => {
                          removeTrigger.current = event.currentTarget;
                          setMessage("");
                          setRemovalError("");
                          setRemoval(m);
                        }}>
                          {t("Remove")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="admin-panel">
          <h2>{t("Grant or update access")}</h2>
          <form onSubmit={save}>
            <label> {t("Email")} <input
                required
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label> {t("Name")} <input
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label> {t("Role")} <select
                value={role}
                onChange={(e) => setRole(e.target.value as Member["role"])}
              >
                <option value="marketing_editor">{t("Marketing Editor")}</option>
                <option value="owner">{t("Owner")}</option>
              </select>
            </label>
            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              /> {t("Access enabled")} </label>
            <button className="button dark" disabled={busy || !!removal}>
              {busy ? t("Saving…") : t("Save access")}
            </button>
          </form>
          <p className="admin-help"> {t("Marketing Editors can manage images, descriptions, variants, prices and publication. Owners also manage team access and view activity. Disabling access takes effect on the next protected request.")} </p>
        </section>
      </div>
      <p role="status" className="admin-message">
        {errorText(message)}
      </p>
    </>
  );
}
