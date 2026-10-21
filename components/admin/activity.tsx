"use client";
import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-browser";
import { money } from "../../lib/commerce";
import { useStaff } from "./admin-shell";
type Entry = {
  id: number;
  actor_email: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
};
const labels: Record<string, string> = {
  price_vnd: "Regular price",
  sale_price_vnd: "Sale price",
  available_quantity: "Available quantity",
  display_name: "Name",
  is_demo: "Demo product",
  sort_order: "Display order",
  color_hex: "Colour code",
  storage_path: "Image file",
};
function value(key: string, v: unknown) {
  if (v === null || v === undefined) return "—";
  if (key.includes("price") && typeof v === "number") return money(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}
export function Activity() {
  const profile = useStaff();
  const [entries, setEntries] = useState<Entry[]>([]),
    [message, setMessage] = useState("Loading activity…");
  useEffect(() => {
    if (profile.role !== "owner") return;
    void adminFetch("/activity")
      .then((r) => {
        setEntries(r.activity);
        setMessage(r.activity.length ? "" : "No activity recorded yet.");
      })
      .catch((e) => setMessage(e.message));
  }, [profile.role]);
  if (profile.role !== "owner")
    return (
      <div className="admin-panel">
        <h1>Owner access required.</h1>
      </div>
    );
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">A RECORD OF EVERY CHANGE</p>
          <h1>Activity history</h1>
          <p>The latest 100 product, image, price and access changes.</p>
        </div>
      </div>
      <div className="admin-panel">
        <p role="status">{message}</p>
        {entries.map((entry) => {
          const keys = [
            ...new Set([
              ...Object.keys(entry.before_data ?? {}),
              ...Object.keys(entry.after_data ?? {}),
            ]),
          ].filter(
            (key) =>
              ![
                "id",
                "product_id",
                "version",
                "updated_at",
                "created_at",
              ].includes(key) &&
              JSON.stringify(entry.before_data?.[key]) !==
                JSON.stringify(entry.after_data?.[key]),
          );
          return (
            <details key={entry.id} className="admin-activity">
              <summary>
                <span>
                  <strong>
                    {(entry.after_data?.name as string) ||
                      (entry.before_data?.name as string) ||
                      entry.entity_type.replaceAll("_", " ")}
                  </strong>
                  <small>
                    {entry.actor_email || "System setup"} ·{" "}
                    {entry.action.toLowerCase()}
                  </small>
                </span>
                <time>
                  {new Date(entry.created_at).toLocaleString("en-GB")}
                </time>
              </summary>
              <dl>
                {keys.map((key) => (
                  <div key={key}>
                    <dt>{labels[key] ?? key.replaceAll("_", " ")}</dt>
                    <dd>
                      <span>{value(key, entry.before_data?.[key])}</span> →{" "}
                      <strong>{value(key, entry.after_data?.[key])}</strong>
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          );
        })}
      </div>
    </>
  );
}
