"use client";
import { createClient } from "@supabase/supabase-js";
import { STAFF_AUTH_REQUIRED, STAFF_ACCESS_CHANGED } from "./admin-navigation";
let client: ReturnType<typeof createClient> | undefined;
export function staffAuth() {
  if (typeof window === "undefined") throw Error("Staff authentication is browser-only.");
  return (client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storageKey: "wons.staff.auth", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
  ));
}
export class AdminRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminRequestError";
    this.status = status;
  }
}
function abortable<T>(task: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new DOMException("Request cancelled.", "AbortError"));
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException("Request cancelled.", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    task.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}
export async function adminFetch(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (init.signal?.aborted) controller.abort();
  init.signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(cancel, 15000);
  try {
    const { data: { session }, error } = await abortable(staffAuth().auth.getSession(), controller.signal);
    if (error || !session) throw new AdminRequestError("Your session ended. Please sign in again.", 401);
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);
    if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
    const response = await fetch(`/api/admin${path}`, {
      ...init, headers, cache: "no-store", signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new AdminRequestError(body?.message ?? "This request could not be completed.", response.status);
    if (!body) throw new AdminRequestError("The server returned an incomplete response. Please try again.", 503);
    return body;
  } catch (error) {
    if (error instanceof AdminRequestError && error.status === 401) {
      window.dispatchEvent(new Event(STAFF_AUTH_REQUIRED));
    }
    if (error instanceof AdminRequestError && error.status === 403) {
      window.dispatchEvent(new Event(STAFF_ACCESS_CHANGED));
    }
    if (controller.signal.aborted && !init.signal?.aborted) {
      throw new AdminRequestError("The request took too long. Please try again.", 504);
    }
    if (error instanceof TypeError) {
      throw new AdminRequestError("Could not connect to the store. Check your connection and try again.", 503);
    }
    throw error;
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", cancel);
  }
}
