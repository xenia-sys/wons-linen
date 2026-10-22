"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "../../lib/admin-browser";
import { activityAction, activityChanges, activityFieldLabels, activityTitle, activityTypes, activityValue } from "../../lib/admin-activity";
import type { ActivityEntry } from "../../lib/admin-activity";
import { useStaff } from "./admin-shell";
type ActivityResponse = { activity: ActivityEntry[]; nextCursor: string | null };
const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
export function Activity() {
  const profile = useStaff();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [previousPages, setPreviousPages] = useState<(string | null)[]>([]);
  const [type, setType] = useState("all");
  const [action, setAction] = useState("all");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (profile.role !== "owner") return;
    let active = true;
    const controller = new AbortController();
    const params = new URLSearchParams({ type, action });
    if (cursor) params.set("cursor", cursor);
    setLoading(true);
    setError("");
    void adminFetch("/activity?" + params.toString(), { signal: controller.signal })
      .then((response: ActivityResponse) => {
        if (!Array.isArray(response.activity)) throw Error("Activity history returned an incomplete response. Please try again.");
        if (active) {
          setEntries(response.activity);
          setNextCursor(response.nextCursor);
        }
      }).catch((cause: unknown) => {
        if (active && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Activity history could not be loaded. Please try again.");
      }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [profile.role, type, action, cursor, refresh]);
  if (profile.role !== "owner") return <section className="admin-panel"><h1>Owner access required.</h1><p>Activity history is available to the WONS Owner.</p><Link href="/admin/products">Go to products</Link></section>;
  function newest() {
    setCursor(null);
    setPreviousPages([]);
    setRefresh(value => value + 1);
  }
  function filter(nextType: string, nextAction: string) {
    setType(nextType); setAction(nextAction); setCursor(null); setPreviousPages([]);
  }
  return <>
    <div className="admin-page-heading">
      <div><p className="eyebrow">OWNER TOOLS</p><h1>Activity history</h1><p>Who changed what, and when. Open a change to compare before and after.</p></div>
      <button onClick={newest} disabled={loading}>{loading ? "Loading…" : "Refresh activity"}</button>
    </div>
    <section className="admin-panel admin-activity-panel" aria-busy={loading}>
      <div className="admin-filters">
        <label>Area<select value={type} onChange={event => filter(event.target.value, action)}>{activityTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Action<select value={action} onChange={event => filter(type, event.target.value)}><option value="all">All actions</option><option value="INSERT">Created / added</option><option value="UPDATE">Updated</option><option value="DELETE">Removed</option></select></label>
        {(type !== "all" || action !== "all") && <button onClick={() => filter("all", "all")}>Clear filters</button>}
      </div>
      <p className="admin-help">Times are shown in Vietnam time (GMT+7). {cursor ? "Earlier activity." : "Newest activity first."}</p>
      {loading ? <div className="admin-activity-state" role="status">Loading activity history…</div>
      : error ? <div className="admin-activity-state"><p className="admin-error" role="alert">{error}</p><button className="button dark" onClick={() => setRefresh(value => value + 1)}>Try again</button></div>
      : !entries.length ? <div className="admin-activity-state" role="status">
        <h2>{type !== "all" || action !== "all" ? "No changes match these filters." : "No changes recorded yet."}</h2>
        <p>Product, price, gallery and staff access changes appear here after they are saved.</p>
        <Link className="underlined-link" href="/admin/products">Manage products →</Link>
      </div> : <>
        <p className="admin-help" role="status">{entries.length} {entries.length === 1 ? "change" : "changes"} on this page</p>
        <div className="admin-event-list">
          {entries.map(entry => {
            const fields = activityChanges(entry);
            const entityLabel = activityTypes.find(item => item.value === entry.entity_type)?.label ?? "Store";
            return <details className="admin-activity admin-event" key={entry.id}>
              <summary>
                <span className="admin-event-summary"><span className="admin-badge">{entityLabel}</span><strong>{activityAction(entry)}</strong><span className="admin-event-title">{activityTitle(entry)}</span><small>By {entry.actor_email || "System setup"}</small></span>
                <span className="admin-event-meta"><time dateTime={entry.created_at}>{dateFormat.format(new Date(entry.created_at))}</time><span className="admin-event-toggle">View details</span></span>
              </summary>
              {fields.length ? <div className="admin-event-diff"><div className="admin-change-heading" aria-hidden="true"><span>Field</span><span>Before</span><span>After</span></div><dl className="admin-change-list">{fields.map(key => <div key={key}><dt>{activityFieldLabels[key] ?? key.replaceAll("_", " ")}</dt><dd><span className="admin-change-before" aria-label="Before">{activityValue(key, entry.before_data?.[key])}</span><span className="admin-change-after" aria-label="After">{activityValue(key, entry.after_data?.[key])}</span></dd></div>)}</dl></div> : <p className="admin-help">Saved without changing the tracked content fields.</p>}
              {entry.product && <Link className="underlined-link admin-event-link" href={"/admin/products/" + entry.product.id}>Open product →</Link>}
              {entry.entity_type === "staff_members" && <Link className="underlined-link admin-event-link" href="/admin/team">Manage team access →</Link>}
            </details>;
          })}
        </div>
        <div className="admin-pagination">
          <button disabled={loading || !previousPages.length} onClick={() => {
            setCursor(previousPages[previousPages.length - 1] ?? null);
            setPreviousPages(pages => pages.slice(0, -1));
          }}>← Newer activity</button>
          <button disabled={loading || !nextCursor} onClick={() => {
            if (!nextCursor) return;
            setPreviousPages(pages => [...pages, cursor]);
            setCursor(nextCursor);
          }}>Older activity →</button>
        </div>
      </>}
    </section>
  </>;
}
