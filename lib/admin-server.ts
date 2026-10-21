import { createClient } from "@supabase/supabase-js";
import type { StaffRole } from "./admin-validation";
export const adminDeploymentEnabled = () =>
  process.env.VERCEL_ENV === "production" ||
  (process.env.NODE_ENV === "development" &&
    process.env.WONS_ADMIN_LOCAL_WRITES === "true");
export class AdminError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function authorizedStaff(request: Request, ownerOnly = false) {
  if (!adminDeploymentEnabled())
    throw new AdminError(
      "Store administration is available on the production website only.",
      403,
    );
  const token = request.headers
    .get("Authorization")
    ?.match(/^Bearer ([^\s]+)$/)?.[1];
  if (!token) throw new AdminError("Please sign in to continue.", 401);
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  const {
    data: { user },
    error,
  } = await db.auth.getUser(token);
  if (error || !user)
    throw new AdminError("Your session expired. Please sign in again.", 401);
  const { data: profile, error: roleError } = await db.rpc("staff_profile");
  if (roleError)
    throw new AdminError(
      "Store access could not be verified. Please try again.",
      503,
    );
  const role = profile?.role as StaffRole | undefined;
  if (
    !role ||
    !["owner", "marketing_editor"].includes(role) ||
    (ownerOnly && role !== "owner")
  )
    throw new AdminError("You do not have permission for this action.", 403);
  return { db, user, role };
}
export function adminError(error: unknown) {
  const known = error instanceof AdminError;
  return Response.json(
    {
      message:
        error instanceof Error
          ? error.message
          : "This request could not be completed.",
    },
    {
      status: known ? error.status : 400,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export async function adminJson(request: Request) {
  const raw = await request.text();
  if (raw.length > 500000)
    throw new AdminError("The product form is too large.", 413);
  try {
    return JSON.parse(raw);
  } catch {
    throw new AdminError("Invalid request data.");
  }
}
export function databaseError(error: { code?: string; message?: string }) {
  if (error.code === "40001")
    return new AdminError(
      "This product changed in another session. Reload before saving again.",
      409,
    );
  if (error.code === "23505")
    return new AdminError(
      "This product URL, SKU, email or image already exists.",
      409,
    );
  if (error.code === "42501")
    return new AdminError("You do not have permission for this action.", 403);
  if (error.code === "23514")
    return new AdminError(
      error.message?.includes("last active Owner")
        ? "The last active Owner cannot be removed."
        : "Check prices, variants, image descriptions and publication requirements.",
    );
  return new AdminError("Changes could not be saved. Please try again.", 503);
}
