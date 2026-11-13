"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ADMIN_LANGUAGE_KEY, parseAdminLocale, translateAdmin, translateAdminError } from "../../lib/admin-i18n";
import type { AdminLocale, AdminTranslator } from "../../lib/admin-i18n";

type AdminLanguage = { locale: AdminLocale; dateLocale: string; setLanguage: (value: AdminLocale) => void; t: AdminTranslator; errorText: (message: string) => string };
const AdminLanguageContext = createContext<AdminLanguage | null>(null);

export function useAdminLanguage() {
  const value = useContext(AdminLanguageContext);
  if (!value) throw Error("Admin language provider is required.");
  return value;
}

export function AdminLanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<AdminLocale>("en");
  useEffect(() => {
    try {
      setLocale(parseAdminLocale(localStorage.getItem(ADMIN_LANGUAGE_KEY)));
    } catch {
      // Browsers that block storage can still switch for this visit.
    }
    const sync = (event: StorageEvent) => {
      if (event.key === ADMIN_LANGUAGE_KEY || event.key === null) setLocale(parseAdminLocale(event.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const value = useMemo<AdminLanguage>(() => ({
    locale,
    dateLocale: locale === "vi" ? "vi-VN" : "en-GB",
    setLanguage(value) {
      setLocale(value);
      try {
        localStorage.setItem(ADMIN_LANGUAGE_KEY, value);
      } catch {
        // Keep the selection in memory when persistence is unavailable.
      }
    },
    t: (message, values) => translateAdmin(locale, message, values),
    errorText: message => translateAdminError(locale, message),
  }), [locale]);
  return <AdminLanguageContext.Provider value={value}>{children}</AdminLanguageContext.Provider>;
}

export function AdminLanguageSwitch() {
  const { locale, t, setLanguage } = useAdminLanguage();
  return <label className="admin-language-switch">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z" />
    </svg>
    <span className="admin-sr-only">{t("Language")}</span>
    <select value={locale} onChange={event => setLanguage(parseAdminLocale(event.target.value))}>
      <option value="en" lang="en">English</option>
      <option value="vi" lang="vi">Tiếng Việt</option>
    </select>
  </label>;
}
