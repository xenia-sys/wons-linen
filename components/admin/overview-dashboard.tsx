"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { adminFetch } from "../../lib/admin-browser";
import { OVERVIEW_PERIODS, parseOverviewPeriod, type OverviewPeriod, type OverviewPoint, type OverviewReport } from "../../lib/admin-overview";
import { ORDER_FLOW, ORDER_STATUS_LABELS } from "../../lib/orders";
import { useAdminLanguage } from "./admin-language";
import { StartCodTest } from "./start-cod-test";

const orderStatuses = [...ORDER_FLOW, "cancelled"] as const;
const inventoryGroups = [
  { key: "in_stock", label: "In stock · 4+ units" },
  { key: "low_stock", label: "Low stock · 1–3 units" },
  { key: "out_of_stock", label: "Out of stock · 0 units" },
] as const;

const calendarDate = (value: string) => new Date(value + "T00:00:00Z");

function chartStep(max: number, revenue: boolean) {
  if (max === 0) return revenue ? 1_000_000 : 1;
  const power = 10 ** Math.floor(Math.log10(max / 3));
  const step = [1, 2, 2.5, 5, 10].find(n => n * power * 3 >= max)! * power;
  return Math.max(revenue ? 100_000 : 1, Math.ceil(step));
}

function TrendChart({ points, daily, metric }: {
  points: OverviewPoint[]; daily: boolean; metric: "revenue_vnd" | "units";
}) {
  const { t, dateLocale } = useAdminLanguage();
  const gradientId = useId();
  const titleId = useId();
  const revenue = metric === "revenue_vnd";
  const title = t(revenue ? (daily ? "Daily revenue" : "Weekly revenue") : (daily ? "Daily units sold" : "Weekly units sold"));
  const date = new Intl.DateTimeFormat(dateLocale, { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  const axis = new Intl.NumberFormat(dateLocale, { maximumFractionDigits: 2 });
  const amount = new Intl.NumberFormat(dateLocale, revenue ? { style: "currency", currency: "VND" } : {});
  const step = chartStep(Math.max(...points.map(point => point[metric])), revenue);
  const bottom = 134;
  const top = 22;
  const left = 42;
  const right = 510;
  const slot = (right - left) / points.length;
  const x = (index: number) => left + (index + 0.5) * slot;
  const y = (value: number) => bottom - (bottom - top) * value / (step * 3);
  const width = Math.min(slot * 0.58, 48);
  const coords = points.map((point, i) => x(i) + "," + y(point[metric]));
  const every = points.length > 7 ? 3 : points.length > 5 ? 2 : 1;
  return (
    <section className="overview-card" aria-labelledby={titleId}>
      <header className="overview-card-head">
        <div><h2 id={titleId}>{title}</h2><p>{t(revenue ? "By order completion date" : "Items in completed orders")}</p></div>
        <span className="overview-chip">{t(revenue ? "Million VND" : "Units")}</span>
      </header>
      <svg className="overview-chart" viewBox="0 0 524 169" aria-hidden="true">
        {revenue && <defs><linearGradient id={gradientId} x2="0" y2="100%"><stop stopColor="#d7bb7d" stopOpacity=".48" /><stop offset="1" stopColor="#f7efd9" stopOpacity=".45" /></linearGradient></defs>}
        {[0, 1, 2, 3].map(level => <g key={level}>
          <line className="overview-gridline" x1={left} x2={right} y1={y(step * level)} y2={y(step * level)} />
          <text x={left - 7} y={y(step * level) + 4} textAnchor="end">{axis.format(step * level / (revenue ? 1_000_000 : 1))}</text>
        </g>)}
        {revenue && <>
          <polygon fill={`url(#${gradientId})`} points={`${x(0)},${bottom} ${coords.join(" ")} ${x(points.length - 1)},${bottom}`} />
          <polyline className="overview-revenue-line" points={coords.join(" ")} />
        </>}
        {points.map((point, i) => {
          const value = point[metric];
          const tooltip = (daily ? date.format(calendarDate(point.start_date)) : `${date.format(calendarDate(point.start_date))} – ${date.format(calendarDate(point.end_date))}`) + " · " + amount.format(value);
          return <g key={point.start_date}>
            {revenue ? <circle className="overview-revenue-dot" cx={x(i)} cy={y(value)} r="4.6"><title>{tooltip}</title></circle>
              : <rect className="overview-sales-bar" data-last={i === points.length - 1} x={x(i) - width / 2} y={value ? y(value) : bottom - 1} width={width} height={Math.max(bottom - y(value), 1)} rx="3"><title>{tooltip}</title></rect>}
            {!revenue && points.length <= 7 && value > 0 && <text className="overview-value-label" x={x(i)} y={y(value) - 7} textAnchor="middle">{axis.format(value)}</text>}
            {(i % every === 0 || (i === points.length - 1 && i % every > 1)) && <text x={x(i)} y="157" textAnchor="middle">{date.format(calendarDate(point.start_date))}</text>}
          </g>;
        })}
      </svg>
      <details className="overview-chart-data">
        <summary>{t("View chart values")}</summary>
        <table className="admin-table">
          <thead><tr><th scope="col">{t("Date range")}</th><th scope="col">{title}</th></tr></thead>
          <tbody>{points.map(point => <tr key={point.start_date}>
            <td>{date.format(calendarDate(point.start_date))}{point.start_date !== point.end_date && <> – {date.format(calendarDate(point.end_date))}</>}</td>
            <td>{amount.format(point[metric])}</td>
          </tr>)}</tbody>
        </table>
      </details>
    </section>
  );
}

function ReportContents({ report, daily }: { report: OverviewReport; daily: boolean }) {
  const { t, dateLocale } = useAdminLanguage();
  const number = new Intl.NumberFormat(dateLocale);
  const money = new Intl.NumberFormat(dateLocale, { style: "currency", currency: "VND" });
  const { sales, inventory, order_counts } = report;
  const totalOrders = orderStatuses.reduce((sum, status) => sum + (order_counts[status] ?? 0), 0);
  const maxOrders = Math.max(1, ...Object.values(order_counts));
  const totalVariants = inventoryGroups.reduce((sum, group) => sum + inventory[group.key], 0);
  const watch = inventory.low_stock + inventory.out_of_stock;
  const cards = [
    { label: "Confirmed COD revenue", value: money.format(sales.revenue_vnd), detail: t("From {count} completed orders", { count: number.format(sales.orders) }) },
    { label: "Units sold", value: number.format(sales.units), detail: t("Items in completed orders") },
    { label: "Available inventory", value: number.format(inventory.units), detail: t("{low} low-stock · {out} out of stock", { low: number.format(inventory.low_stock), out: number.format(inventory.out_of_stock) }) },
    { label: "Orders placed", value: number.format(totalOrders), detail: t("{count} awaiting confirmation", { count: number.format(order_counts.pending ?? 0) }) },
  ];
  return <>
    <dl className="overview-kpis">
      {cards.map(card => <div className="overview-card overview-kpi" key={card.label}>
        <dt>{t(card.label)}</dt><dd>{card.value}</dd><dd className="overview-kpi-detail">{card.detail}</dd>
      </div>)}
    </dl>
    <div className="overview-grid">
      <TrendChart points={report.series} daily={daily} metric="revenue_vnd" />
      <TrendChart points={report.series} daily={daily} metric="units" />
      <section className="overview-card" aria-labelledby="overview-stock">
        <header className="overview-card-head">
          <div><h2 id="overview-stock">{t("Inventory health")}</h2><p>{t("{count} published variants tracked", { count: number.format(totalVariants) })}</p></div>
          <span className="overview-chip">{t("Current stock")}</span>
        </header>
        <div className="overview-stock-meter" aria-hidden="true">
          {inventoryGroups.filter(group => inventory[group.key] > 0).map(group => <span className={group.key} key={group.key} style={{ flexGrow: inventory[group.key] }} />)}
        </div>
        <ul className="overview-stock-list">{inventoryGroups.map(group => <li key={group.key}>
          <span><i aria-hidden="true" className={group.key} />{t(group.label)}</span><strong>{t("{count} variants", { count: number.format(inventory[group.key]) })}</strong>
        </li>)}</ul>
        <p className="overview-attention">{watch > 0
          ? t("Check {count} variants that are low or out of stock.", { count: number.format(watch) })
          : t(totalVariants ? "No variants are low or out of stock." : "No published product variants to report.")}</p>
      </section>
      <section className="overview-card" aria-labelledby="overview-orders">
        <header className="overview-card-head">
          <div><h2 id="overview-orders">{t("Orders by status")}</h2><p>{t("Current status of orders placed in the period")}</p></div>
          <span className="overview-chip">{number.format(totalOrders)} · {t("Orders")}</span>
        </header>
        <ul className="overview-status-list">{orderStatuses.map(status => {
          const count = order_counts[status] ?? 0;
          return <li key={status}>
            <span>{t(ORDER_STATUS_LABELS[status])}</span>
            <span className="overview-status-track" aria-hidden="true"><i className={status} style={{ width: `${100 * count / maxOrders}%` }} /></span>
            <strong>{number.format(count)}</strong>
          </li>;
        })}</ul>
        {totalOrders === 0 && <p className="overview-attention">{t("No real orders were placed in this period.")}</p>}
      </section>
    </div>
  </>;
}

export function OverviewDashboard() {
  const { t, errorText, dateLocale } = useAdminLanguage();
  const [period, setPeriod] = useState<OverviewPeriod>(30);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ period: OverviewPeriod; revision: number; report?: OverviewReport; error?: string } | null>(null);
  const current = state?.period === period && state.revision === revision ? state : null;
  const report = current?.report;
  const date = new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium", timeZone: "UTC" });

  useEffect(() => {
    const controller = new AbortController();
    void adminFetch(`/overview?days=${period}`, { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setState({ period, revision, report: result.report });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({
        period, revision, error: error instanceof Error ? error.message : "The overview could not be loaded. Try again.",
      });
    });
    return () => controller.abort();
  }, [period, revision]);

  return <div className="overview-dashboard">
    <header className="overview-heading">
      <div>
        <p className="eyebrow">{t("STORE PERFORMANCE")}</p>
        <h1>{t("Store overview")}</h1>
        <p>{t("Track revenue, sales, available inventory and order progress.")}</p>
      </div>
      <div className="overview-period">
        <label>{t("Date range")}
          <select value={period} onChange={event => {
            const next = parseOverviewPeriod(event.target.value);
            if (next !== null && next !== period) {
              setPeriod(next);
              setRevision(value => value + 1);
            }
          }}>
            {OVERVIEW_PERIODS.map(days => <option key={days} value={days}>{t("Last {days} days", { days })}</option>)}
          </select>
        </label>
        <button type="button" disabled={!current} onClick={() => setRevision(value => value + 1)}>{t("Refresh")}</button>
        {report && <p className="overview-dates">{date.format(calendarDate(report.start_date))} – {date.format(calendarDate(report.end_date))}</p>}
      </div>
    </header>
    <div aria-busy={!current}>
      {report ? <ReportContents report={report} daily={period === 7} /> : (
        <div className="overview-card overview-feedback">
          {current?.error
            ? <><p role="alert">{errorText(current.error)}</p><button type="button" onClick={() => setRevision(value => value + 1)}>{t("Try again")}</button></>
            : <p role="status">{t("Loading overview…")}</p>}
        </div>
      )}
    </div>
    <div className="overview-foot"><p>{t("Test COD orders are excluded. Inventory shows current stock, regardless of the date range.")}</p><p>{t("Vietnam time")}</p></div>
    <section className="overview-card overview-quick-actions">
      <h2>{t("Quick actions")}</h2>
      <div className="admin-actions">
        <Link className="button dark" href="/admin/products/new">{t("+ New product")}</Link>
        <Link className="button light" href="/admin/orders">{t("Open Orders →")}</Link>
        <StartCodTest />
      </div>
    </section>
  </div>;
}
