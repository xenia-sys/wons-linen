const emailLinkTypes = ["email", "magiclink", "signup"] as const;
export type EmailLink = { tokenHash: string; type: (typeof emailLinkTypes)[number] };

/**
 * Reads a Supabase Auth email link of the form ?token_hash=…&type=email, used by the
 * Confirm sign up and Magic link templates (link: {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email).
 * Unlike the PKCE code flow, it verifies in any browser, so a link requested on a laptop
 * can be opened on a phone.
 */
export function emailLinkFrom(url: URL): EmailLink | undefined {
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (!tokenHash || !/^[A-Za-z0-9_-]{8,128}$/.test(tokenHash)) return undefined;
  const known = emailLinkTypes.find((value) => value === type);
  return known ? { tokenHash, type: known } : undefined;
}

/** Removes a single-use email link token from the address bar and browser history. */
export function forgetEmailLink() {
  const clean = new URL(window.location.href);
  clean.searchParams.delete("token_hash");
  clean.searchParams.delete("type");
  window.history.replaceState(null, "", clean);
}
