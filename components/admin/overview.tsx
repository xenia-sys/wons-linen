"use client";
import Link from "next/link";
import { useStaff } from "./admin-shell";
import { staffRoleLabel } from "../../lib/admin-navigation";
export function AdminOverview() {
  const profile = useStaff();
  return <>
    <div className="admin-page-heading"><div><p className="eyebrow">YOUR WONS WORKSPACE</p><h1>Store overview</h1><p>Signed in as {staffRoleLabel(profile.role)}. Choose what you want to manage.</p></div><Link className="button dark" href="/admin/products/new">+ New product</Link></div>
    <div className="admin-overview-grid">
      <section className="admin-panel admin-task-card"><span className="admin-badge">STORE OPERATIONS</span><h2>Products</h2><p>Upload photos, edit descriptions and variants, set regular or sale prices, and publish or hide products.</p><Link className="button dark" href="/admin/products">Manage products →</Link></section>
      {profile.role === "owner" && <>
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
    <section className="admin-panel admin-access-summary"><h2>Your access</h2><p>{profile.role === "owner" ? "You can manage the complete collection, grant or revoke staff permissions, and review activity history." : "You can manage products, images, descriptions, variants, availability, regular and sale prices, and publication. The Owner manages staff permissions and activity history."}</p></section>
  </>;
}
