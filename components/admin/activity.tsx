"use client";
import { useAdminLanguage } from "./admin-language";
import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "../../lib/admin-browser";
import { activityAction, activityChanges, activityFieldLabels, activityTitle, activityTypes, activityValue } from "../../lib/admin-activity";
import type { ActivityEntry } from "../../lib/admin-activity";
import { useStaff } from "./admin-shell";
import { ActivityFilter } from "./activity-filter";
type ActivityResponse = { activity: ActivityEntry[]; nextCursor: string | null };
const activityActions = [
  { value: "all", label: "All actions" }, { value: "INSERT", label: "Created / added" },
  { value: "UPDATE", label: "Updated" }, { value: "DELETE", label: "Removed" },
];
export function Activity() {
  const { t, errorText, dateLocale } = useAdminLanguage();
  const dateFormat = new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
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
  if (profile.role !== "owner") return <section className="admin-panel"><h1>{t("Owner access required.")}</h1><p>{t("Activity history is available to the WONS Owner.")}</p><Link href="/admin/products">{t("Go to products")}</Link></section>;
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
      <div><p className="eyebrow">{t("OWNER TOOLS")}</p><h1>{t("Activity history")}</h1><p>{t("Who changed what, and when. Open a change to compare before and after.")}</p></div>
      <button onClick={newest} disabled={loading}>{loading ? t("Loading…") : t("Refresh activity")}</button>
    </div>
    <section className="admin-panel admin-activity-panel" aria-busy={loading}>
      <div className="admin-filters">
        <ActivityFilter label={t("Area")} value={type} options={activityTypes} onChange={value => filter(value, action)} />
        <ActivityFilter label={t("Action")} value={action} options={activityActions} onChange={value => filter(type, value)} />
        {(type !== "all" || action !== "all") && <button onClick={() => filter("all", "all")}>{t("Clear filters")}</button>}
      </div>
      <p className="admin-help">{t("Times are shown in Vietnam time (GMT+7).")} {cursor ? t("Earlier activity.") : t("Newest activity first.")}</p>
      {loading ? <div className="admin-activity-state" role="status">{t("Loading activity history…")}</div>
      : error ? <div className="admin-activity-state"><p className="admin-error" role="alert">{errorText(error)}</p><button className="button dark" onClick={() => setRefresh(value => value + 1)}>{t("Try again")}</button></div>
      : !entries.length ? <div className="admin-activity-state" role="status">
        <h2>{type !== "all" || action !== "all" ? t("No changes match these filters.") : t("No changes recorded yet.")}</h2>
        <p>{t("Product, price, gallery and staff access changes appear here after they are saved.")}</p>
        <Link className="underlined-link" href="/admin/products">{t("Manage products →")}</Link>
      </div> : <>
        <p className="admin-help" role="status">{t(entries.length === 1 ? "{count} change on this page" : "{count} changes on this page", { count: entries.length })}</p>
        <div className="admin-event-list">
          {entries.map(entry => {
            const fields = activityChanges(entry);
            const entityLabel = activityTypes.find(item => item.value === entry.entity_type)?.label ?? "Store";
            return <details className="admin-activity admin-event" key={entry.id}>
              <summary>
                <span className="admin-event-summary"><span className="admin-badge">{t(entityLabel)}</span><strong>{t(activityAction(entry))}</strong><span className="admin-event-title">{activityTitle(entry, t)}</span><small>{t("By {actor}", { actor: entry.actor_email || t("System setup") })}</small></span>
                <span className="admin-event-meta"><time dateTime={entry.created_at}>{dateFormat.format(new Date(entry.created_at))}</time><span className="admin-event-toggle">{t("View details")}</span></span>
              </summary>
              {fields.length ? <div className="admin-event-diff"><div className="admin-change-heading" aria-hidden="true"><span>{t("Field")}</span><span>{t("Before")}</span><span>{t("After")}</span></div><dl className="admin-change-list">{fields.map(key => <div key={key}><dt>{activityFieldLabels[key] ? t(activityFieldLabels[key]) : key.replaceAll("_", " ")}</dt><dd><span className="admin-change-before" aria-label={t("Before")}>{activityValue(key, entry.before_data?.[key], t, dateLocale)}</span><span className="admin-change-after" aria-label={t("After")}>{activityValue(key, entry.after_data?.[key], t, dateLocale)}</span></dd></div>)}</dl></div> : <p className="admin-help">{t("Saved without changing the tracked content fields.")}</p>}
              {entry.product && <Link className="underlined-link admin-event-link" href={"/admin/products/" + entry.product.id}>{t("Open product →")}</Link>}
              {entry.entity_type === "staff_members" && <Link className="underlined-link admin-event-link" href="/admin/team">{t("Manage team access →")}</Link>}
              {entry.entity_type === "storefront_images" && <Link className="underlined-link admin-event-link" href="/admin/storefront">{t("Manage storefront images →")}</Link>}
              {entry.entity_type === "discount_events" && <Link className="underlined-link admin-event-link" href="/admin/discount-events">{t("Manage discount events →")}</Link>}
            </details>;
          })}
        </div>
        <div className="admin-pagination">
          <button disabled={loading || !previousPages.length} onClick={() => {
            setCursor(previousPages[previousPages.length - 1] ?? null);
            setPreviousPages(pages => pages.slice(0, -1));
          }}>{t("← Newer activity")}</button>
          <button disabled={loading || !nextCursor} onClick={() => {
            if (!nextCursor) return;
            setPreviousPages(pages => [...pages, cursor]);
            setCursor(nextCursor);
          }}>{t("Older activity →")}</button>
        </div>
      </>}
    </section>
  </>;
}
