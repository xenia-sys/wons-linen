import type { Metadata } from "next";
import { AdminShell } from "../../components/admin/admin-shell";
import { AdminLanguageProvider } from "../../components/admin/admin-language";
import { adminDeploymentEnabled } from "../../lib/admin-server";
import "./admin.css";
export const metadata: Metadata = {
  title: "Store Administration",
  robots: { index: false, follow: false },
};
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLanguageProvider><AdminShell enabled={adminDeploymentEnabled()}>{children}</AdminShell></AdminLanguageProvider>;
}
