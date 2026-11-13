"use client";
import { useAdminLanguage } from "./admin-language";
import { useEffect, useState } from "react";
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
    [message, setMessage] = useState("");
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
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">{t("PEOPLE & PERMISSIONS")}</p>
          <h1>{t("Team & access")}</h1>
          <p>{t("Each teammate uses their own verified email account.")}</p>
        </div>
      </div>
      <div className="admin-editor-layout">
        <section className="admin-panel">
          <h2>{t("Approved team")}</h2>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("Teammate")}</th>
                  <th>{t("Role")}</th>
                  <th>{t("Access")}</th>
                  <th>{t("Edit")}</th>
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
            <button className="button dark" disabled={busy}>
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
