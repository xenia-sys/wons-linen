"use client";
import Link from "next/link";
import { useStaff } from "./admin-shell";
import { staffRoleLabel } from "../../lib/admin-navigation";
import { StartCodTest } from "./start-cod-test";
export function AdminOverview() {
  const profile = useStaff();
  return <>
    <div className="admin-page-heading"><div><p className="eyebrow">YOUR WONS WORKSPACE</p><h1>Store overview</h1><p>Signed in as {staffRoleLabel(profile.role)}. Choose what you want to manage.</p></div><Link className="button dark" href="/admin/products/new">+ New product</Link></div>
    {profile.role === "owner" && (
      <section className="admin-panel" aria-labelledby="admin-cod-test">
        <h2 id="admin-cod-test">Test a COD order</h2>
        <p>Try checkout with sample details, then find the order marked Test in your inbox.</p>
        <div className="admin-actions">
          <StartCodTest />
          <Link className="underlined-link" href="/admin/orders">Open Orders →</Link>
        </div>
      </section>
    )}
    <div className="admin-overview-grid">
      <section className="admin-panel admin-task-card"><span className="admin-badge">STORE OPERATIONS</span><h2>Products</h2><p>Upload photos, edit descriptions and variants, set regular or sale prices, and publish or hide products.</p><Link className="button dark" href="/admin/products">Manage products →</Link></section>
      {profile.role === "owner" && <>
        <section className="admin-panel admin-task-card"><span className="admin-badge">OWNER ONLY</span><h2>Storefront images</h2><p>Update the main homepage cover and the covers for the Women and Men collections on the homepage.</p><Link className="underlined-link" href="/admin/storefront">Manage storefront images →</Link></section>
        <section className="admin-panel admin-task-card"><span className="admin-badge">OWNER ONLY</span><h2>Team & access</h2><p>Approve individual staff emails, assign Owner or Marketing Editor access, and disable access when needed.</p><Link className="underlined-link" href="/admin/team">Manage team →</Link></section>
        <section className="admin-panel admin-task-card"><span className="admin-badge">OWNER ONLY</span><h2>Activity history</h2><p>See who changed a product, price, image or staff permission. Compare the values before and after each change.</p><Link className="underlined-link" href="/admin/activity">Review activity →</Link></section>
      </>}
    </div>
    <section className="admin-panel">
      <h2>From draft to storefront</h2>
      <ol className="admin-workflow-steps">
        <li><strong>Create a hidden product</strong><p>Add its name, description, department and first variant, then save.</p></li>
        <li><strong>Add photos & pricing</strong><p>Upload and arrange the gallery, check variant prices and availability, then save.</p></li>
        <li><strong>Publish when ready</strong><p>Choose Published and save. Choose Hidden to withdraw it from the storefront.</p></li>
      </ol>
    </section>
    <section className="admin-panel admin-access-summary"><h2>Your access</h2><p>{profile.role === "owner" ? "You can manage the complete collection and orders, grant or revoke staff permissions, and review activity history." : "You can manage products, images, descriptions, variants, availability, regular and sale prices, and publication. Orders and COD tests require an Owner account."}</p></section>
  </>;
}
