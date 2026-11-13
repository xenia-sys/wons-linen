import { vietnameseAdminMessages } from "./admin-messages.ts";

export type AdminLocale = "en" | "vi";
export const ADMIN_LANGUAGE_KEY = "wons.admin.language";
export type AdminTranslator = (message: string, values?: Record<string, string | number>) => string;

export function parseAdminLocale(value: unknown): AdminLocale {
  return value === "vi" ? "vi" : "en";
}

export function translateAdmin(locale: AdminLocale, message: string, values?: Record<string, string | number>): string {
  const template = locale === "vi" && Object.hasOwn(vietnameseAdminMessages, message)
    ? vietnameseAdminMessages[message] : message;
  return values ? template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match) : template;
}

export function translateAdminError(locale: AdminLocale, message: string) {
  if (!message || locale === "en") return message;
  const rules = [
    [/^This file exceeds (\d+) MB\. Export a smaller copy and try again\.$/, "This file exceeds {limit} MB. Export a smaller copy and try again.", ["limit"]],
    [/^Use up to (\d+) product images\.$/, "Use up to {count} product images.", ["count"]],
    [/^(.+) is required\.$/, "{label} is required.", ["label"]],
    [/^(.+) must contain (\d+)–(\d+) characters\.$/, "{label} must contain {min}–{max} characters.", ["label", "min", "max"]],
    [/^(.+) must be a whole number of at least (\d+)\.$/, "{label} must be a whole number of at least {min}.", ["label", "min"]],
  ] as const;
  const exact = translateAdmin(locale, message);
  if (exact !== message) return exact;
  for (const [pattern, key, names] of rules) {
    const parts = pattern.exec(message);
    if (parts) return translateAdmin(locale, key, Object.fromEntries(names.map((name, i) => [name, translateAdmin(locale, parts[i + 1])])));
  }
  return message;
}
