"use client";
import { useAdminLanguage } from "./admin-language";
import Link from "next/link";
import { useStaff } from "./admin-shell";
import { staffRoleLabel } from "../../lib/admin-navigation";
import { StartCodTest } from "./start-cod-test";
export function AdminOverview() {
  const { t } = useAdminLanguage();
  const profile = useStaff();
  return <>
    <div className="admin-page-heading"><div><p className="eyebrow">{t("YOUR WONS WORKSPACE")}</p><h1>{t("Store overview")}</h1><p>{t("Signed in as {role}. Choose what you want to manage.", { role: t(staffRoleLabel(profile.role)) })}</p></div><Link className="button dark" href="/admin/products/new">{t("+ New product")}</Link></div>
    {profile.role === "owner" && (
      <section className="admin-panel" aria-labelledby="admin-cod-test">
        <h2 id="admin-cod-test">{t("Test a COD order")}</h2>
        <p>{t("Try checkout with sample details, then find the order marked Test in your inbox.")}</p>
        <div className="admin-actions">
          <StartCodTest />
          <Link className="underlined-link" href="/admin/orders">{t("Open Orders →")}</Link>
        </div>
      </section>
    )}
    <div className="admin-overview-grid">
      <section className="admin-panel admin-task-card"><span className="admin-badge">{t("STORE OPERATIONS")}</span><h2>{t("Products")}</h2><p>{t("Upload photos, edit descriptions and variants, set VND prices, and publish or hide products.")}</p><Link className="button dark" href="/admin/products">{t("Manage products →")}</Link></section>
      <section className="admin-panel admin-task-card"><span className="admin-badge">{t("STORE OPERATIONS")}</span><h2>{t("Discount events")}</h2><p>{t("Schedule a percentage discount for selected products and preview their event prices.")}</p><Link className="underlined-link" href="/admin/discount-events">{t("Manage discount events →")}</Link></section>
      {profile.role === "owner" && <>
        <section className="admin-panel admin-task-card"><span className="admin-badge">{t("OWNER ONLY")}</span><h2>{t("Storefront images")}</h2><p>{t("Update the main homepage cover and the covers for the Women and Men collections on the homepage.")}</p><Link className="underlined-link" href="/admin/storefront">{t("Manage storefront images →")}</Link></section>
        <section className="admin-panel admin-task-card"><span className="admin-badge">{t("OWNER ONLY")}</span><h2>{t("Team & access")}</h2><p>{t("Approve individual staff emails, assign Owner or Marketing Editor access, and disable access when needed.")}</p><Link className="underlined-link" href="/admin/team">{t("Manage team →")}</Link></section>
        <section className="admin-panel admin-task-card"><span className="admin-badge">{t("OWNER ONLY")}</span><h2>{t("Activity history")}</h2><p>{t("See who changed a product, price, image or staff permission. Compare the values before and after each change.")}</p><Link className="underlined-link" href="/admin/activity">{t("Review activity →")}</Link></section>
      </>}
    </div>
    <section className="admin-panel">
      <h2>{t("From draft to storefront")}</h2>
      <ol className="admin-workflow-steps">
        <li><strong>{t("Create a hidden product")}</strong><p>{t("Add its name, description, department and first variant, then save.")}</p></li>
        <li><strong>{t("Add photos & pricing")}</strong><p>{t("Upload and arrange the gallery, check variant prices and availability, then save.")}</p></li>
        <li><strong>{t("Publish when ready")}</strong><p>{t("Choose Published and save. Choose Hidden to withdraw it from the storefront.")}</p></li>
      </ol>
    </section>
    <section className="admin-panel admin-access-summary"><h2>{t("Your access")}</h2><p>{profile.role === "owner" ? t("You can manage the complete collection, discount events and orders, grant or revoke staff permissions, and review activity history.") : t("You can manage products, prices, discount events and publication. Orders and COD tests require an Owner account.")}</p></section>
  </>;
}
