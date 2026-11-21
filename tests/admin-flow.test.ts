import test from "node:test";
import assert from "node:assert/strict";
import { adminLoginPath, adminNavigation, adminNextPath, canOpenAdminSection } from "../lib/admin-navigation.ts";
import { activityAction, activityChanges, activityProductId, activityTitle, activityValue, parseActivityQuery } from "../lib/admin-activity.ts";
import type { ActivityEntry } from "../lib/admin-activity.ts";
import { informationParagraphs, parseInformationEdit } from "../lib/information-pages.ts";
const productId = "25f13db6-08d9-438f-b1ce-209f0ce2e946";
function entry(values: Partial<ActivityEntry> = {}): ActivityEntry {
  return { id: 1, actor_email: "staff@example.com", entity_type: "products", entity_id: productId,
    action: "UPDATE", before_data: null, after_data: null, created_at: "2026-10-22T01:00:00Z", ...values };
}
test("admin deep links preserve only approved local destinations", () => {
  for (const path of ["/admin", "/admin/activity", "/admin/team", "/admin/orders", "/admin/storefront", "/admin/information/our-story", "/admin/information/client-care", "/admin/discount-events", "/admin/products", "/admin/products/new", "/admin/products/" + productId]) {
    assert.equal(adminNextPath(path, "owner"), path);
  }
  assert.equal(adminNextPath("/admin/activity/?source=mail#latest"), "/admin/activity");
  assert.equal(adminLoginPath("/admin/activity"), "/admin/login?next=%2Fadmin%2Factivity");
});
test("admin return destinations reject open redirects and unrecognised paths", () => {
  for (const value of [null, "", "https://other.example/admin", "//other.example", "/admin/login",
    "/admin/../team", "/admin/%2e%2e/team", "/admin/%2f%2fother.example",
    "/admin/products/not-a-uuid", "/admin/information/privacy", "/admin/activity\\evil", "/admin/activity\n"]) {
    assert.equal(adminNextPath(value), "/admin", String(value));
  }
});
test("Marketing deep links cannot open Owner sections", () => {
  assert.equal(adminNextPath("/admin/activity", "marketing_editor"), "/admin/products");
  assert.equal(adminNextPath("/admin/team", "marketing_editor"), "/admin/products");
  assert.equal(adminNextPath("/admin/products/" + productId, "marketing_editor"), "/admin/products/" + productId);
  for (const path of ["/admin/team", "/admin/team/member", "/admin/activity", "/admin/activity/", "/admin/orders", "/admin/storefront", "/admin/information/our-story", "/admin/information/client-care"]) {
    assert.equal(canOpenAdminSection("marketing_editor", path), false);
    assert.equal(canOpenAdminSection("owner", path), true);
  }
});
test("navigation exposes operations to Marketing and additional Owner tools to Owner", () => {
  assert.deepEqual(adminNavigation("marketing_editor").map(item => item.href), ["/admin", "/admin/products", "/admin/discount-events"]);
  assert.deepEqual(adminNavigation("owner").filter(item => item.group === "Owner tools").map(item => item.href), ["/admin/storefront", "/admin/information/our-story", "/admin/information/client-care", "/admin/team", "/admin/activity"]);
  assert.ok(adminNavigation("owner").some(item => item.href === "/admin/orders"));
});
test("information publication requires valid copy and keeps paragraph breaks from pasted text", () => {
  const input = { version: 2, eyebrow: " WONS ", title: "Our story", body: "One line\r\ncontinued.\r\n \r\nNext paragraph. " };
  const { version, copy } = parseInformationEdit(input);
  assert.equal(version, 2);
  assert.equal(copy.eyebrow, "WONS");
  assert.deepEqual(informationParagraphs(copy.body), ["One line\ncontinued.", "Next paragraph."]);
  for (const invalid of [{ version: "2" }, { title: "Two\nlines" }, { body: "  \n " }, { body: "x".repeat(10001) }]) {
    assert.throws(() => parseInformationEdit({ ...input, ...invalid }));
  }
});
test("activity filter defaults and cursor accept documented values", () => {
  assert.equal(parseActivityQuery(new URLSearchParams({ type: "storefront_images" })).type, "storefront_images");
  assert.deepEqual(parseActivityQuery(new URLSearchParams()), { type: "all", action: "all", cursor: null });
  assert.deepEqual(parseActivityQuery(new URLSearchParams({ type: "variants", action: "UPDATE", cursor: "42" })),
    { type: "variants", action: "UPDATE", cursor: "42" });
  assert.equal(parseActivityQuery(new URLSearchParams({ cursor: "9223372036854775807" })).cursor, "9223372036854775807");
});
test("activity filters reject unsupported fields, actions and malformed cursors", () => {
  const invalid: Record<string, string>[] = [
    { type: "auth.users" }, { action: "DROP" }, { cursor: "-1" }, { cursor: "0" },
    { cursor: "1 OR 1=1" }, { cursor: "1.5" }, { cursor: "9223372036854775808" },
    { cursor: "99999999999999999999" }, { cursor: "" },
  ];
  for (const params of invalid) assert.throws(() => parseActivityQuery(new URLSearchParams(params)));
});
test("activity ignores timestamps and version changes while retaining changed product fields", () => {
  const value = entry({ before_data: { name: "Linen shirt", version: 1, updated_at: "old" },
    after_data: { name: "Relaxed linen shirt", version: 2, updated_at: "new" } });
  assert.deepEqual(activityChanges(value), ["name"]);
  assert.equal(activityAction(value), "Product updated");
  assert.equal(activityAction(entry({ before_data: { version: 1 }, after_data: { version: 2 } })), "Product saved");
});
test("publication and price events use clear operation labels", () => {
  assert.equal(activityAction(entry({ before_data: { status: "hidden" }, after_data: { status: "published" } })), "Product published");
  assert.equal(activityAction(entry({ before_data: { status: "published" }, after_data: { status: "hidden" } })), "Product hidden");
  assert.equal(activityAction(entry({ entity_type: "variants", before_data: { price_vnd: 800000 },
    after_data: { price_vnd: 800000, sale_price_vnd: 650000 } })), "Pricing updated");
  assert.equal(activityValue("price_vnd", 650000), "VND 650,000");
  assert.equal(activityValue("sale_price_vnd", null), "—");
});
test("access and gallery events describe approval, disabling and image order", () => {
  assert.equal(activityAction(entry({ entity_type: "staff_members", action: "INSERT" })), "Access approved");
  assert.equal(activityAction(entry({ entity_type: "staff_members", before_data: { active: true },
    after_data: { active: false } })), "Access disabled");
  assert.equal(activityAction(entry({ entity_type: "staff_members", before_data: { role: "owner" },
    after_data: { role: "marketing_editor" } })), "Role changed");
  assert.equal(activityAction(entry({ entity_type: "product_images", before_data: { sort_order: 0 },
    after_data: { sort_order: 1 } })), "Gallery reordered");
});
test("history titles and product links resolve from the affected entity", () => {
  const cover = entry({ entity_type: "storefront_images", entity_id: "home-women",
    before_data: { storage_path: "home-women/previous.webp" }, after_data: { storage_path: "home-women/next.webp" } });
  assert.deepEqual(activityChanges(cover), ["storage_path"]);
  assert.equal(activityTitle(cover), "Women cover");
  assert.equal(activityAction(cover), "Cover published");
  assert.equal(activityAction({ ...cover, action: "DELETE", after_data: null }), "Default cover restored");
  assert.equal(activityProductId(cover), null);
  const page = entry({ entity_type: "information_pages", entity_id: "client-care", before_data: { body: "Before", version: 1 }, after_data: { body: "After", version: 2 } });
  assert.equal(parseActivityQuery(new URLSearchParams({ type: "information_pages" })).type, "information_pages");
  assert.deepEqual(activityChanges(page), ["body"]);
  assert.equal(activityTitle(page), "Client care");
  assert.equal(activityAction(page), "Website page updated");
  assert.equal(activityProductId(page), null);
  assert.equal(activityTitle(entry({ entity_type: "variants", product: { id: productId, name: "Linen shirt" },
    after_data: { sku: "WONS-M-WHITE", product_id: productId } })), "Linen shirt · WONS-M-WHITE");
  assert.equal(activityProductId(entry({ entity_type: "product_images", before_data: { product_id: productId } })), productId);
  assert.equal(activityProductId(entry()), productId);
  assert.equal(activityProductId(entry({ entity_type: "staff_members" })), null);
  assert.equal(activityTitle(entry({ entity_type: "staff_members", after_data: { display_name: "Store team" } })), "Store team");
});
