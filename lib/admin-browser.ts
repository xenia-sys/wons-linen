"use client";
import { createClient } from "@supabase/supabase-js";
let client: ReturnType<typeof createClient> | undefined;
export function staffAuth() {
  if (typeof window === "undefined")
    throw Error("Staff authentication is browser-only.");
  return (client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storageKey: "wons.staff.auth",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  ));
}
export async function adminFetch(path: string, init: RequestInit = {}) {
  const {
    data: { session },
  } = await staffAuth().auth.getSession();
  if (!session) throw Error("Please sign in to continue.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  if (init.body && !(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const response = await fetch(`/api/admin${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok)
    throw Error(body.message ?? "This request could not be completed.");
  return body;
}
