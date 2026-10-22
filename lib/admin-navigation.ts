import type { StaffRole } from "./admin-validation.ts";

export const STAFF_AUTH_REQUIRED = "wons:staff-auth-required";
export const STAFF_ACCESS_CHANGED = "wons:staff-access-changed";

export function isAdminPath(path: string) {
  return path === "/admin" || path.startsWith("/admin/");
}
export function ownerSection(path: string) {
  return ["/admin/team", "/admin/activity"].some(section => path === section || path.startsWith(section + "/"));
}
export function canOpenAdminSection(role: StaffRole, path: string) {
  return !ownerSection(path) || role === "owner";
}
export function adminNextPath(value: unknown, role?: StaffRole): string {
  if (typeof value !== "string" || /[\\\u0000-\u001f\u007f]/.test(value)) return "/admin";
  const path = value.split(/[?#]/)[0].replace(/\/$/, "");
  const allowed = ["/admin", "/admin/products", "/admin/products/new", "/admin/team", "/admin/activity"].includes(path)
    || /^\/admin\/products\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path);
  if (!allowed) return "/admin";
  return role && !canOpenAdminSection(role, path) ? "/admin/products" : path;
}
export function adminLoginPath(path: string) {
  return "/admin/login?next=" + encodeURIComponent(adminNextPath(path));
}
export function adminSectionName(path: string) {
  if (path === "/admin/activity") return "Activity history";
  if (path === "/admin/team") return "Team & access";
  if (path === "/admin/products/new") return "New product";
  if (path.startsWith("/admin/products/")) return "Edit product";
  if (path === "/admin/products") return "Products";
  return "Overview";
}
export function staffRoleLabel(role: StaffRole) {
  return role === "owner" ? "Owner" : "Marketing Editor";
}
export function adminNavigation(role: StaffRole) {
  const items = [
    { href: "/admin", label: "Overview", group: "Store operations" },
    { href: "/admin/products", label: "Products", group: "Store operations" },
  ];
  return role === "owner" ? [...items,
    { href: "/admin/team", label: "Team & access", group: "Owner tools" },
    { href: "/admin/activity", label: "Activity history", group: "Owner tools" },
  ] : items;
}
